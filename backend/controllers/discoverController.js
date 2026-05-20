// controllers/discoverController.js
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const fetchAllPages = async (url, headers) => {
  let page = 0;
  let totalPages = 1;
  const allObjects = [];

  while (page < totalPages) {
    const response = await axios.get(`${url}&page=${page}&size=100`, { headers });
    const searchResult = response.data?._embedded?.searchResult;
    allObjects.push(...(searchResult?._embedded?.objects || []));
    totalPages = searchResult?.page?.totalPages || 1;
    page++;
  }
  return allObjects;
};

const getDiscover = async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).send('Le paramètre query est requis');
  }

  const headers = {
    'Authorization': req.dspaceAuthToken,
    'Cookie': req.dspaceCookies,
  };

  try {
    // Recherche principale avec la requête complète
    let allObjects = await fetchAllPages(
      `${config.DSPACE_API_URL}/discover/search/objects?query=${encodeURIComponent(query)}`,
      headers
    );

    // Fallback: si DSpace ne retourne rien, chercher chaque token via f.author en parallèle
    if (allObjects.length === 0) {
      const tokens = query.split(/[\s,]+/).map(t => t.trim()).filter(t => t.length > 1);

      if (tokens.length > 1) {
        const tokenResults = await Promise.all(
          tokens.map(token =>
            fetchAllPages(
              `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(token)},contains`,
              headers
            ).catch(() => [])
          )
        );

        // Union dédupliquée des résultats de chaque token
        const objectMap = new Map();
        tokenResults.flat().forEach(obj => {
          const id = obj._embedded?.indexableObject?.id;
          if (id) objectMap.set(id, obj);
        });
        allObjects = Array.from(objectMap.values());
      }
    }

    res.json({ total: allObjects.length, objects: allObjects });

  } catch (error) {
    logger.error('Erreur lors de la récupération des objets :', error.message);
    res.status(500).send('Erreur lors de la récupération des données');
  }
};



module.exports = { getDiscover };
