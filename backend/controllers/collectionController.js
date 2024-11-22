const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getCollections = async (req, res) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/collections`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    res.json(response.data);
  } catch (error) {
    logger.error('Erreur lors de la récupération des collections: ' + error.message);
    if (error.response) {
      logger.error('Détails de l\'erreur: ', error.response.data);
    }
    res.status(500).send('Erreur lors de la récupération des collections');
  }
};

module.exports = {
  getCollections,
};
