const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getMappedCollections = async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).send('Le paramètre query est requis');
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items/${query}/mappedCollections`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    res.json(response.data);
  } catch (error) {
    logger.error('Url: ' + `${config.DSPACE_API_URL}/core/items/${query}/mappedCollections`);
    logger.error('Erreur lors de la récupération de mappedCollections: ' + error.message);
    res.status(500).send('Erreur lors de la récupération de mappedCollections');
  }
};

module.exports = {
  getMappedCollections,
};
