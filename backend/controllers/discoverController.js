// controllers/discoverController.js
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getDiscover = async (req, res) => {
  const query = req.query.query;

  if (!query) {
    return res.status(400).send('Le paramètre query est requis');
  }

  try {
    let page = 0;
    const size = 100; // Tu peux ajuster cette valeur selon la limite max du backend
    let totalPages = 1;
    let allObjects = [];

    while (page < totalPages) {
      const response = await axios.get(`${config.DSPACE_API_URL}/discover/search/objects?query=${encodeURIComponent(query)}&page=${page}&size=${size}`, {
        headers: {
          'Authorization': req.dspaceAuthToken,
          'Cookie': req.dspaceCookies,
        }
      });

      const searchResult = response.data?._embedded?.searchResult;
      const objects = searchResult?._embedded?.objects || [];
      console.log(objects);
      allObjects.push(...objects);

      totalPages = searchResult?.page?.totalPages || 1;
      page++;
    }

    res.json({
      total: allObjects.length,
      objects: allObjects
    });

  } catch (error) {
    logger.error('Erreur lors de la récupération des objets :', error.message);
    res.status(500).send('Erreur lors de la récupération des données');
  }
};



module.exports = { getDiscover };
