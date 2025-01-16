const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const MAX_PARALLEL_REQUESTS = 5; // Nombre maximum de requêtes parallèles

const getWorkflowitems = async (req, res) => {
  try {
    const size = 30; // Taille des lots
    let page = 0;
    let hasMore = true;

    // Définir les headers pour un streaming textuel
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    while (hasMore) {
      // Récupération de la page actuelle
      const response = await axios.get(`${config.DSPACE_API_URL}/workflow/workflowitems`, {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
        params: { page, size },
      });

      const workflowItems = response.data._embedded?.workflowitems || [];
      const totalElements = response.data.page?.totalElements || 0;
      const totalPages = response.data.page?.totalPages || 1;

      hasMore = workflowItems.length === size; // Vérifie s'il y a une autre page

      // Traiter les items par lots pour limiter le nombre de requêtes simultanées
      const detailedItems = [];
      for (let i = 0; i < workflowItems.length; i += MAX_PARALLEL_REQUESTS) {
        // Créer un lot d'items à traiter
        const chunk = workflowItems.slice(i, i + MAX_PARALLEL_REQUESTS);

        // Attendre la fin de toutes les requêtes du lot actuel
        const chunkDetails = await Promise.all(chunk.map((item) => getItemDetails(item, req)));
        detailedItems.push(...chunkDetails); // Ajouter les résultats au tableau principal
      }

      // Ajouter les informations de pagination dans la réponse
      const pageInfo = {
        page: {
          size: size,
          totalElements: totalElements,
          totalPages: totalPages,
          number: page,
        },
        items: detailedItems, // Les items détaillés à envoyer
      };

      // Chaque page est envoyée sous forme de ligne JSON indépendante
      console.log('Sending page:', page + 1, 'with items:', detailedItems);
      res.write(`data: ${JSON.stringify(pageInfo)}\n\n`);

      page++; // Passe à la page suivante
    }

    res.end(); // Termine le streaming
  } catch (error) {
    logger.error('Erreur lors du streaming des workflow items: ' + error.message);
    if (!res.headersSent) {
      res.status(500).send('Erreur lors du streaming des workflow items');
    } else {
      res.end();
    }
  }
};


// Récupération des détails d'un item
const getItemDetails = async (item, req) => {
  const itemDetails = { uuid: null, name: null, lastModified: null, metadata: {}, step: null };

  try {
    const requests = [];

    // Récupère les détails de l'item
    if (item._links?.item?.href) {
      requests.push(
        axios.get(item._links.item.href, {
          headers: { Authorization: req.dspaceAuthToken, Cookie: req.dspaceCookies },
        }).then(({ data }) => {
          itemDetails.uuid = data.uuid;
          itemDetails.name = data.name;
          itemDetails.lastModified = data.lastModified;
          itemDetails.metadata = {
            ORCIDAuteurThese: data.metadata['UdeM.ORCIDAuteurThese']?.map((m) => m.value) || [],
            contributorAuthor: data.metadata['dc.contributor.author']?.map((m) => m.value) || [],
            provenance: data.metadata['dc.description.provenance']?.map((m) => m.value) || [],
            type: data.metadata['dc.type']?.map((m) => m.value) || [],
            title: data.metadata['dc.title']?.map((m) => m.value) || [],
          };
        })
      );
    }

    // Récupère les détails du step
    if (item._links?.step?.href) {
      requests.push(
        axios.get(item._links.step.href, {
          headers: { Authorization: req.dspaceAuthToken, Cookie: req.dspaceCookies },
        }).then(({ data }) => {
          itemDetails.step = data?.id || null;
        })
      );
    }

    // Exécute toutes les requêtes en parallèle
    await Promise.all(requests);
  } catch (error) {
    logger.warn(`Erreur lors de la récupération des détails d'un item: ${error.message}`);
  }

  return itemDetails;
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

const getFilters = async (req, res) => {
  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/workflow/filters`, {
      headers: {
        Authorization: req.dspaceAuthToken,
        Cookie: req.dspaceCookies,
      },
    });
    // Traitez les filtres pour le format attendu par le front-end
    res.json({
      types: response.data.types || [],
      statuses: response.data.statuses || [],
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des filtres : ' + error.message);
    res.status(500).send('Erreur lors de la récupération des filtres');
  }
};

module.exports = {
  getWorkflowitems,
  getWorkspaceitems,
  getFilters,
};
