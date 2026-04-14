const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const SIZE = 30;

const getWorkflowitems = async (req, res) => {
  try {
    const typeFiltre = req.query.type;
    let allItems = [];
    let page = 0;
    let hasMore = true;
    let totalElements = 0;

    // Fetch the first page to get totalElements
    const firstPage = await fetchPage(page, req);
    allItems = allItems.concat(firstPage);
    totalElements = firstPage[0]?.totalElements || 0;
    const totalPages = Math.ceil(totalElements / SIZE);

    const pageRequests = [];
    for (let i = 1; i < totalPages && hasMore; i++) {
      pageRequests.push(fetchPage(i, req));
    }

    const results = await Promise.all(pageRequests);
    const filteredResults = results.flat();
    allItems = allItems.concat(filteredResults);

    let detailedItems = await fetchItemDetails(allItems, req);

    if (typeFiltre?.trim()) {
      detailedItems = detailedItems.filter(item =>
        typeof item.type === 'string' && item.type.includes(typeFiltre)
      );
    }

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

    if (collectionFilter?.trim()) {
      items = items.filter(item => item.sections?.collection === collectionFilter);
    }

    const collectionNames = await fetchCollectionNames(items.map(item => item.sections?.collection).filter(Boolean), req);

    return items.map((item, index) => ({
      totalElements: response.data.page.totalElements,
      workflowId: item.id,
      itemHref: item._links?.item?.href || null,
      collection: collectionNames[index] || null,
    }));
  } catch (error) {
    logger.warn(`Erreur sur la page ${page}: ${error.message}`);
    return [];
  }
};

const fetchCollectionNames = async (collectionIds, req) => {
  const uniqueIds = [...new Set(collectionIds)];
  const requests = uniqueIds.map(uuid =>
    axios.get(`${config.DSPACE_API_URL}/core/collections/${uuid}`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
    })
  );

  try {
    const responses = await Promise.all(requests);
    const collectionNamesMap = new Map(responses.map(response => [response.data.uuid, response.data.name]));
    return collectionIds.map(id => collectionNamesMap.get(id));
  } catch (error) {
    logger.warn(`Erreur lors de la récupération des collections: ${error.message}`);
    return Array(collectionIds.length).fill(null);
  }
};

const fetchItemDetails = async (items, req) => {
  let countExcludedName = 0;

  const requests = items.map(async (item) => {
    if (!item.itemHref) return null;

    try {
      const response = await axios.get(item.itemHref, {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
      });

      const data = response.data;

      if (!data.name?.trim()) {
        countExcludedName++;
        return null;
      }

      return {
        workflowId: item.workflowId,
        id: data.id,
        lastModified: data.lastModified,
        uuid: data.uuid,
        name: data.name,
        handle: data.handle,
        collection: item.collection || null,
        type: data.metadata["dc.type"]?.[0]?.value || "",
        metadata: {
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
