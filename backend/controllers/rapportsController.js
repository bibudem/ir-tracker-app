const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getWorkflowitems = async (req, res) => {
  try {
    // 1. Récupérer les workflow items
    const response = await axios.get(`${config.DSPACE_API_URL}/workflow/workflowitems`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
    });

    // Récupérer les paramètres de pagination de la requête (page et size)
    const page = parseInt(req.query.page) || 1; // Page courante, valeur par défaut 1
    const size = parseInt(req.query.size) || 20; // Nombre d'éléments par page, valeur par défaut 20
    const startIndex = (page - 1) * size; // Index de départ pour la pagination
    const endIndex = page * size; // Index de fin pour la pagination

    const workflowItems = response.data._embedded?.workflowitems || [];

    // 2. Traiter les items pour extraire les détails nécessaires
    const detailedItems = await Promise.all(
      workflowItems.map(async (item) => {
        // Détails de base de l'item
        const itemDetails = {
          uuid: null,
          name: null,
          lastModified: null,
          metadata: {},
          step: null,
        };

        const itemPromises = [];

        // Récupérer les détails depuis `_links.item`
        if (item._links?.item?.href) {
          itemPromises.push(
            axios.get(item._links.item.href, {
              headers: {
                Authorization: req.dspaceAuthToken,
                Cookie: req.dspaceCookies,
              },
            }).then((itemResponse) => {
              const data = itemResponse.data;
              itemDetails.uuid = data.uuid;
              itemDetails.name = data.name;
              itemDetails.lastModified = data.lastModified;

              const metadata = data.metadata || {};
              itemDetails.metadata = {
                ORCIDAuteurThese: metadata['UdeM.ORCIDAuteurThese']?.map((m) => m.value) || [],
                contributorAuthor: metadata['dc.contributor.author']?.map((m) => m.value) || [],
                provenance: metadata['dc.description.provenance']?.map((m) => m.value) || [],
                type: metadata['dc.type']?.map((m) => m.value) || [],
                title: metadata['dc.title']?.map((m) => m.value) || [],
                abstract: metadata['dcterms.abstract']?.map((m) => m.value) || [],
              };
            })
          );
        }

        // Récupérer le step depuis `_links.step`
        if (item._links?.step?.href) {
          itemPromises.push(
            axios.get(item._links.step.href, {
              headers: {
                Authorization: req.dspaceAuthToken,
                Cookie: req.dspaceCookies,
              },
            }).then((stepResponse) => {
              itemDetails.step = stepResponse.data?.id || null;
            })
          );
        }

        // Attendre toutes les requêtes pour l'item
        await Promise.all(itemPromises);

        return itemDetails;
      })
    );

    // 3. Trier les items par date `lastModified` (ordre croissant)
    const sortedItems = detailedItems.sort((a, b) => {
      const dateA = new Date(a.lastModified || 0);
      const dateB = new Date(b.lastModified || 0);
      return dateA - dateB; // Ordre ASC
    });


    // 4. Appliquer la pagination : découper le tableau selon `startIndex` et `endIndex`
    const paginatedItems = sortedItems.slice(startIndex, endIndex);

    // 5. Retourner les items paginés et les informations de pagination
    res.json({
      items: paginatedItems,
      totalItems: sortedItems.length, // Nombre total d'éléments sans pagination
      page,
      size,
      totalPages: Math.ceil(sortedItems.length / size), // Calcul du nombre total de pages
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des workflow items: ' + error.message);
    if (error.response) {
      logger.error('Détails de l\'erreur: ', error.response.data);
    }
    res.status(500).send('Erreur lors de la récupération des workflow items');
  }
};

const getWorkspaceitems = async (req, res) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/submission/workspaceitems`, {
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
  getWorkflowitems,
  getWorkspaceitems
};
