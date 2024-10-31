const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getDiscover = async (req, res) => {
  const query = req.query.query;  // Récupérer le paramètre "query" depuis la chaîne de requête
  if (!query) {
    return res.status(400).send('Le paramètre query est requis');
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/discover/search/objects?query=` + query);
    res.json(response.data);
  } catch (error) {
    logger.error('Url: ' + `${config.DSPACE_API_URL}discover/search/objects?query=` + query);
    logger.error('Erreur lors de la récupération des discover: ' + error.message);
    res.status(500).send('Erreur lors de la récupération des données');
  }
};

module.exports = {
  getDiscover,
};
