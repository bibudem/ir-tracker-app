const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getMappedCollections = async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).send('Le paramètre query est requis');
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items/${query}/owningCollection`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    res.json(response.data);
  } catch (error) {
    logger.error('Url: ' + `${config.DSPACE_API_URL}/core/items/${query}/owningCollection`);
    logger.error('Erreur lors de la récupération de owningCollection: ' + error.message);
    res.status(500).send('Erreur lors de la récupération de owningCollection');
  }
};

const getSubmitter = async (req, res) => {
  try {
    console.log(req.params.uuid);
    const uuid = req.params.uuid;
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items/${uuid}/submitter`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    res.json(response.data);
  } catch (error) {
    logger.error('Erreur lors de la récupération des infos de submitter: ' + error.message);
    if (error.response) {
      logger.error('Détails de l\'erreur: ', error.response.data);
    }
    res.status(500).send('Erreur lors de la récupération des infos de submitter');
  }
};

module.exports = {
  getMappedCollections,
  getSubmitter
};
