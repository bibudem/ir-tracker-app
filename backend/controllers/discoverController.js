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
    const response = await axios.get(`${config.DSPACE_API_URL}/discover/search/objects?query=${query}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    console.log(`${config.DSPACE_API_URL}/discover/search/objects?query=${query}`);
    res.json(response.data);
  } catch (error) {
    logger.error('Erreur lors de la récupération des objets :', error.message);
    res.status(500).send('Erreur lors de la récupération des données');
  }
};

module.exports = { getDiscover };
