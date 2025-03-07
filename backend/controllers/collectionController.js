const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getCollections = async (req, res) => {
  try {
    let collections = [];
    let nextPage = `${config.DSPACE_API_URL}/core/collections`;

    while (nextPage) {
      const response = await axios.get(nextPage, {
        headers: {
          'Authorization': req.dspaceAuthToken,
          'Cookie': req.dspaceCookies,
        }
      });

      const data = response.data;
      if (data._embedded && data._embedded.collections) {
        collections = collections.concat(
          data._embedded.collections
            .filter(col => col.name && col.name.trim() !== '') // Vérifie que le name n'est pas vide
            .map(col => ({
              id: col.id,
              name: col.name.trim()
            }))
        );
      }

      nextPage = data._links?.next?.href || null;
    }

    res.json(collections);
  } catch (error) {
    logger.error('Erreur lors de la récupération des collections: ' + error.message);

    if (error.response) {
      logger.error(`Code HTTP: ${error.response.status}`);
      logger.error('Détails de l\'erreur: ', JSON.stringify(error.response.data, null, 2));
    }

    res.status(500).send('Erreur interne du serveur');
  }
};


const getCollectionById = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const response = await axios.get(`${config.DSPACE_API_URL}/core/collections/${uuid}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });
    res.json(response.data.name);
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
  getCollectionById
};
