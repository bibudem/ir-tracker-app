const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const MAX_PAGES = 5;
const SIZE = 30;

const getWorkflowitems = async (req, res) => {
  try {
    const typeFiltre = req.query.type;
    const sortOrder = req.query.sortOrder;
    const sortField = 'lastModified';

    let allItems = [];
    let page = 0;
    let hasMore = true;

    while (hasMore && page < MAX_PAGES) {
      const pageRequests = [];
      for (let i = 0; i < MAX_PAGES && hasMore; i++) {
        pageRequests.push(fetchPage(page + i, req));
      }

      const results = await Promise.all(pageRequests);
      const filteredResults = results.flat();
      allItems = allItems.concat(filteredResults);
      hasMore = filteredResults.length === SIZE * MAX_PAGES;
      page += MAX_PAGES;
    }

    let detailedItems = await fetchItemDetails(allItems, req);

    if (typeFiltre.trim() !== '') {
      detailedItems = detailedItems.filter(item =>
        typeof item.type === 'string' && item.type.includes(typeFiltre)
      );
    }

    // Appliquer le tri
    detailedItems.sort((a, b) => {
      const fieldA = a[sortField] || '';
      const fieldB = b[sortField] || '';
      return sortOrder === 'asc' ? fieldA.localeCompare(fieldB) : fieldB.localeCompare(fieldA);
    });

    res.json({ totalItems: detailedItems.length, items: detailedItems });

  } catch (error) {
    logger.error(`Erreur lors de la récupération des workflow items: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération des workflow items' });
  }
};

const fetchPage = async (page, req) => {
  try {
    const collectionFilter = req.query.collection;
    const response = await axios.get(`${config.DSPACE_API_URL}/workflow/workflowitems`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
      params: { page, size: SIZE },
    });

    let items = response.data._embedded?.workflowitems || [];

    if (collectionFilter && collectionFilter.trim() !== '') {
      items = items.filter(item => item.sections?.collection === collectionFilter);
    }

    return Promise.all(
      items.map(async (item) => {
        const collectionId = item.sections?.collection || null;
        const collectionName = collectionId ? await fetchCollectionName(collectionId, req) : null;
        return {
          workflowId: item.id,
          lastModified: item.lastModified,
          itemHref: item._links?.item?.href || null,
          collection: collectionName,
        };
      })
    );
  } catch (error) {
    logger.warn(`Erreur sur la page ${page}: ${error.message}`);
    return [];
  }
};

const fetchCollectionName = async (uuid, req) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/collections/${uuid}`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
    });
    return response.data.name || null;
  } catch (error) {
    logger.warn(`Erreur lors de la récupération de la collection ${uuid}: ${error.message}`);
    return null;
  }
};

// Récupérer les détails des items avec l'ID de la collection et filtrer
const fetchItemDetails = async (items, req) => {
  let countExcludedName = 0;

  const requests = items.map(async (item) => {
    if (!item.itemHref) return null;

    try {
      // Récupérer les infos détaillées de l'item
      const response = await axios.get(item.itemHref, {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
      });

      const data = response.data;

      // Vérifier si name est vide ou absent
      if (!data.name || data.name.trim() === "") {
        countExcludedName++;
        return null;
      }

      return {
        workflowId: item.workflowId, // Garder le workflow ID
        id: data.id,
        lastModified: data.lastModified,
        uuid: data.uuid,
        name: data.name,
        handle: data.handle,
        collection: item.collection || null, // Ajouter la collection récupérée dans fetchPage
        type: data.metadata["dc.type"]?.[0]?.value || "",
        metadata: {
          "advisor": data.metadata["dc.contributor.advisor"] || [],
          "author": data.metadata["dc.contributor.author"] || [],
          "date.available": data.metadata["dc.date.available"] || [],
          "date.submitted": data.metadata["dc.date.submitted"] || [],
          "provenance": data.metadata["dc.description.provenance"] || [],
          "degree.level": data.metadata["etd.degree.level"] || [],
          "degree.name": data.metadata["etd.degree.name"] || [],
          "affiliation": data.metadata["dc.contributor.affiliation"] || [],
        },
      };

    } catch (error) {
      logger.warn(`Erreur lors de la récupération de l'item ${item.id}: ${error.message}`);
      return null;
    }
  });

  const results = await Promise.all(requests);
  const filteredResults = results.filter(item => item !== null);

  logger.info(`Total items initial: ${items.length}`);
  logger.info(`Items exclus par nom vide: ${countExcludedName}`);
  logger.info(`Total items après filtres: ${filteredResults.length}`);

  return filteredResults;
};

module.exports = { getWorkflowitems };
