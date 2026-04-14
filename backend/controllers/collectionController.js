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

/**
 * Récupère la liste des administrateurs pour chaque étape de validation d'une collection spécifique
 */
const getCollectionWorkflowAdmins = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const roles = ['reviewer', 'editor', 'finaleditor']; // Étapes du workflow
    const adminsByRole = {}; // Stocke les gestionnaires par rôle
    for (const role of roles) {
      try {
        // Récupération du groupe de l'étape
        const groupResponse = await axios.get(`${config.DSPACE_API_URL}/core/collections/${uuid}/workflowGroups/${role}`, {
          headers: {
            'Authorization': req.dspaceAuthToken,
            'Cookie': req.dspaceCookies,
          }
        });

        if (!groupResponse.data._links?.epersons?.href) {
          adminsByRole[role] = []; // Aucun utilisateur trouvé pour cette étape
          continue;
        }

        // Récupération des utilisateurs du groupe
        const epersonsResponse = await axios.get(groupResponse.data._links.epersons.href, {
          headers: {
            'Authorization': req.dspaceAuthToken,
            'Cookie': req.dspaceCookies,
          }
        });
        adminsByRole[role] = epersonsResponse.data._embedded?.epersons || [];
      } catch (err) {
        logger.warn(`Impossible de récupérer les gestionnaires pour l'étape ${role}: ${err.message}`);
        adminsByRole[role] = []; // En cas d'erreur, on met une liste vide
      }
    }

    res.json(adminsByRole);
  } catch (error) {
    logger.error(`Erreur lors de la récupération des gestionnaires du workflow pour la collection ${req.params.uuid}: ${error.message}`);
    if (error.response) {
      logger.error('Détails de l\'erreur: ', JSON.stringify(error.response.data, null, 2));
    }
    res.status(500).send('Erreur lors de la récupération des gestionnaires du workflow');
  }
};

module.exports = {
  getCollections,
  getCollectionById,
  getCollectionWorkflowAdmins
};
