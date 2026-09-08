const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const SIZE = 30;
const FETCH_BATCH_SIZE = 30;

// Rapport "TME en attente" (ajouté le 2026-09-08) : valeurs par défaut des seuils,
// surchargeables via les query params `minDays` / `minYear`.
const TYPE_THESE = 'Thèse ou mémoire / Thesis or Dissertation';
const DEFAULT_MIN_DAYS_INACTIVE = 30;
const DEFAULT_MIN_YEAR_ISSUED = 2025;

// --- Rapport "Suivi des soumissions" (items en workflow) ---

const getWorkflowitems = async (req, res) => {
  try {
    const typeFiltre = req.query.type;

    const firstResult = await fetchPage(0, req);
    let allItems = firstResult.items;
    const totalPages = Math.ceil(firstResult.totalElements / SIZE);

    if (totalPages > 1) {
      const pageRequests = Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 1, req));
      const results = await Promise.all(pageRequests);
      allItems = allItems.concat(results.flatMap(r => r.items));
    }

    // Fetch des noms de collections en une seule fois (dédupliqué sur tous les items)
    const allCollectionIds = allItems.map(item => item.collectionId).filter(Boolean);
    const collectionNamesMap = await fetchCollectionNames(allCollectionIds, req);
    allItems = allItems.map(item => ({
      ...item,
      collection: collectionNamesMap.get(item.collectionId) || null,
    }));

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
    const totalElements = response.data.page?.totalElements || 0;

    if (collectionFilter?.trim()) {
      items = items.filter(item => item.sections?.collection === collectionFilter);
    }

    return {
      totalElements,
      items: items.map(item => ({
        workflowId: item.id,
        itemHref: item._links?.item?.href || null,
        collectionId: item.sections?.collection || null,
      })),
    };
  } catch (error) {
    logger.warn(`Erreur sur la page ${page}: ${error.message}`);
    return { totalElements: 0, items: [] };
  }
};

// --- Rapport "TME en attente" (ajouté le 2026-09-08) ---
// Thèses/mémoires laissés dans le workspace des étudiants (jamais soumis au
// workflow), inactifs depuis `minDays` jours et publiés à partir de `minYear`.

const getWorkspaceThesesRapport = async (req, res) => {
  try {
    const collectionFilter = req.query.collection;
    const minDays = req.query.minDays ? Number(req.query.minDays) : DEFAULT_MIN_DAYS_INACTIVE;
    const minYear = req.query.minYear ? Number(req.query.minYear) : DEFAULT_MIN_YEAR_ISSUED;

    const firstResult = await fetchWorkspacePage(0, req);
    let allItems = firstResult.items;
    const totalPages = Math.ceil(firstResult.totalElements / SIZE);

    if (totalPages > 1) {
      const pageRequests = Array.from({ length: totalPages - 1 }, (_, i) => fetchWorkspacePage(i + 1, req));
      const results = await Promise.all(pageRequests);
      allItems = allItems.concat(results.flatMap(r => r.items));
    }

    const allCollectionIds = allItems.map(item => item.collectionId).filter(Boolean);
    const collectionNamesMap = await fetchCollectionNames(allCollectionIds, req);
    allItems = allItems.map(item => ({
      ...item,
      collection: collectionNamesMap.get(item.collectionId) || null,
    }));

    if (collectionFilter?.trim()) {
      const collectionIds = collectionFilter.split(',').map(s => s.trim()).filter(Boolean);
      allItems = allItems.filter(item => collectionIds.includes(item.collectionId));
    }

    let detailedItems = await fetchItemDetails(allItems, req);

    // Uniquement les thèses et mémoires
    detailedItems = detailedItems.filter(item =>
      typeof item.type === 'string' && item.type.includes(TYPE_THESE)
    );

    // Uniquement les dépôts non modifiés depuis au moins `minDays` jours
    detailedItems = detailedItems.filter(item => {
      const diffDays = (Date.now() - new Date(item.lastModified).getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= minDays;
    });

    // Uniquement les dépôts avec un dc.date.issued >= minYear (exclut au passage les items
    // sans date renseignée, considérés comme trop anciens/incomplets pour ce rapport)
    detailedItems = detailedItems.filter(item => {
      const issuedValue = item.metadata['date.issued']?.[0]?.value;
      const issuedYear = issuedValue ? parseInt(issuedValue.slice(0, 4), 10) : NaN;
      return !isNaN(issuedYear) && issuedYear >= minYear;
    });

    res.json({ totalItems: detailedItems.length, items: detailedItems });

  } catch (error) {
    logger.error(`Erreur lors de la récupération du rapport des thèses en workspace: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de la récupération du rapport des thèses en workspace' });
  }
};

const fetchWorkspacePage = async (page, req) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/submission/workspaceitems`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
      params: { page, size: SIZE },
    });

    const items = response.data._embedded?.workspaceitems || [];
    const totalElements = response.data.page?.totalElements || 0;

    return {
      totalElements,
      items: items.map(item => ({
        workflowId: item.id,
        itemHref: item._links?.item?.href || null,
        collectionId: item.sections?.collection || null,
      })),
    };
  } catch (error) {
    logger.warn(`Erreur sur la page ${page} (workspaceitems): ${error.message}`);
    return { totalElements: 0, items: [] };
  }
};

// --- Fonctions partagées entre les deux rapports ---

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

  const responses = await Promise.allSettled(requests);
  const collectionNamesMap = new Map();
  responses.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      collectionNamesMap.set(result.value.data.uuid, result.value.data.name);
    } else {
      logger.warn(`Erreur collection ${uniqueIds[i]}: ${result.reason?.message}`);
    }
  });

  return collectionNamesMap;
};

const fetchItemDetails = async (items, req) => {
  let countExcludedName = 0;
  const results = [];

  for (let i = 0; i < items.length; i += FETCH_BATCH_SIZE) {
    const batch = items.slice(i, i + FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
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
            type: data.metadata['dc.type']?.[0]?.value || '',
            metadata: {
              author:         data.metadata['dc.contributor.author']     || [],
              'date.available': data.metadata['dc.date.available']       || [],
              'date.submitted': data.metadata['dc.date.submitted']       || [],
              'date.issued':  data.metadata['dc.date.issued']            || [],
              provenance:     data.metadata['dc.description.provenance'] || [],
              'degree.level': data.metadata['etd.degree.level']         || [],
              'degree.name':  data.metadata['etd.degree.name']          || [],
              affiliation:    data.metadata['dc.contributor.affiliation']|| [],
            },
          };
        } catch (error) {
          logger.warn(`Erreur lors de la récupération de l'item ${item.workflowId}: ${error.message}`);
          return null;
        }
      })
    );
    results.push(...batchResults);
  }

  const filteredResults = results.filter(item => item !== null);

  logger.info(`Total items initial: ${items.length}`);
  logger.info(`Items exclus par nom vide: ${countExcludedName}`);
  logger.info(`Total items après filtres: ${filteredResults.length}`);

  return filteredResults;
};

module.exports = { getWorkflowitems, getWorkspaceThesesRapport };