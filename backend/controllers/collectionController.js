const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getCollections = async (req, res) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/collections`);
    res.json(response.data);
  } catch (error) {
    logger.error('Erreur lors de la récupération des collections: ' + error.message);
    res.status(500).send('Erreur lors de la récupération des collections');
  }
};

module.exports = {
  getCollections,
};
