const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getUsers = async (req, res) => {
  const query = req.query.query;
  if (!query) {
    return res.status(400).send({ error: 'Le paramètre query est requis' });
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/eperson/epersons/search/byMetadata?query=${query}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      },
    });

    // Vérifier si des utilisateurs sont retournés
    const epersons = response.data._embedded?.epersons || [];

    // Structurer les données avant de les envoyer au front-end
    const utilisateurs = epersons.map(user => {
      const firstname = user.metadata?.['eperson.firstname']?.[0]?.value || 'N/A';
      const lastname = user.metadata?.['eperson.lastname']?.[0]?.value || 'N/A';
      return {
        id: user.uuid,
        email: user.email,
        fullName: `${firstname} ${lastname}`,
      };
    });

    res.json({ utilisateurs });
  } catch (error) {
    logger.error('Erreur lors de la récupération des utilisateurs:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des utilisateurs' });
  }
};


const getUserItems = async (req, res) => {
  const userId = req.query.userId;
  const filtreAuthor = encodeURIComponent(req.query.fullName);

  if (!userId) {
    return res.status(400).send({ error: 'Le paramètre userId est requis' });
  }

  try {
    // Récupération des workflow items
    const workflowResponse = await axios.get(
      `${config.DSPACE_API_URL}/workflow/workflowitems/search/findBySubmitter?uuid=${userId}`,
      {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
      }
    );

    const workflowItems = workflowResponse.data._embedded?.workflowitems || [];

    // Récupération des workspace items
    const workspaceResponse = await axios.get(
      `${config.DSPACE_API_URL}/submission/workspaceitems/search/findBySubmitter?uuid=${userId}`,
      {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
      }
    );

    const workspaceItems = workspaceResponse.data._embedded?.workspaceitems || [];

    // Récupérer les informations enrichies des workflow items
    const enrichedWorkflowItems = await Promise.all(
      workflowItems.map(async (item) => {
        const itemLink = item._links?.item?.href;
        const stepLink = item._links?.step?.href;
        const idCollection = item.sections?.collection || null;

        let itemDetails = {};
        let stepDetails = {};

        if (itemLink) {
          try {
            const itemResponse = await axios.get(itemLink, {
              headers: {
                Authorization: req.dspaceAuthToken,
                Cookie: req.dspaceCookies,
              },
            });
            itemDetails = itemResponse.data;
          } catch (err) {
            logger.warn(`Erreur lors de la récupération des détails pour l'item ${item.id}: ${err.message}`);
          }
        }

        if (stepLink) {
          try {
            const stepResponse = await axios.get(stepLink, {
              headers: {
                Authorization: req.dspaceAuthToken,
                Cookie: req.dspaceCookies,
              },
            });
            stepDetails = stepResponse.data;
          } catch (err) {
            logger.warn(`Erreur lors de la récupération des détails de l'étape pour l'item ${item.id}: ${err.message}`);
          }
        }

        const metadata = itemDetails?.metadata || {};
        return {
          id: itemDetails?.id || null,
          title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
          description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
          lastModified: item.lastModified || 'Date de modification non disponible',
          submissionDate: metadata['dc.date.submitted']?.[0]?.value || 'Date de soumission non disponible',
          idCollection,
          step: {
            id: stepDetails.id || 'Étape non disponible',
            type: stepDetails.type || 'Type non disponible',
          },
        };
      })
    );

    // Récupérer les informations enrichies des workspace items
    const enrichedWorkspaceItems = await Promise.all(
      workspaceItems.map(async (item) => {
        const itemLink = item._links?.item?.href;
        const idCollection = item.sections?.collection || null;
        let itemDetails = {};

        if (itemLink) {
          try {
            const itemResponse = await axios.get(itemLink, {
              headers: {
                Authorization: req.dspaceAuthToken,
                Cookie: req.dspaceCookies,
              },
            });
            itemDetails = itemResponse.data;
          } catch (err) {
            logger.warn(`Erreur lors de la récupération des détails pour l'item ${item.id}: ${err.message}`);
          }
        }

        const metadata = itemDetails?.metadata || {};
        return {
          id: itemDetails?.id || null,
          title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
          description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
          lastModified: item.lastModified || 'Date de modification non disponible',
          submissionDate: metadata['dc.date.submitted']?.[0]?.value || 'Date de soumission non disponible',
          idCollection
        };
      })
    );
    // Récupérer les autres items liés à l'utilisateur
    let userItemsResponse = await axios.get(
      `${config.DSPACE_API_URL}/discover/search/objects?f.author=${filtreAuthor},equals`,
      {
        headers: {
          Authorization: req.dspaceAuthToken,
          Cookie: req.dspaceCookies,
        },
      }
    );
    let objects = userItemsResponse.data._embedded?.searchResult?._embedded?.objects || [];
// Vérifier si aucun résultat n'a été trouvé
    if (objects.length === 0) {
      const decodedAuthor = decodeURIComponent(filtreAuthor);
      const nameParts = decodedAuthor.split(' ');
      let reversedAuthor = '';
      if (nameParts.length === 2) {
        // Inverser prénom et nom si les deux parties existent
        reversedAuthor = `${nameParts[1]}, ${nameParts[0]}`.trim();
      } else {
        // Si le découpage ne produit pas deux parties, conserver l'original
        reversedAuthor = decodedAuthor;
      }

      // Effectuer une seconde requête avec l'ordre inversé
      userItemsResponse = await axios.get(
        `${config.DSPACE_API_URL}/discover/search/objects?f.author=${encodeURIComponent(reversedAuthor)},equals`,
        {
          headers: {
            Authorization: req.dspaceAuthToken,
            Cookie: req.dspaceCookies,
          },
        }
      );

      objects = userItemsResponse.data._embedded?.searchResult?._embedded?.objects || [];
    }

// Mapper les objets pour les structurer avant de les retourner
    const userItems = objects.map((obj) => {
      const item = obj._embedded?.indexableObject;
      const metadata = item?.metadata || {};
      return {
        id: item?.id || null,
        title: metadata['dc.title']?.[0]?.value || 'Titre non disponible',
        description: metadata['dcterms.abstract']?.[0]?.value || 'Description non disponible',
        lastModified: item?.lastModified || 'Date de modification non disponible',
        submissionDate: metadata['dc.date.accessioned']?.[0]?.value || 'Date de soumission non disponible',
      };
    });

    // Structure des données pour le front-end
    res.json({
      workflowItems: enrichedWorkflowItems,
      workspaceItems: enrichedWorkspaceItems,
      userItems,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des items:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des items' });
  }
};


const getItemDetails = async (req, res) => {
  const itemId = req.query.itemId;
  if (!itemId) {
    return res.status(400).send({ error: 'L\'identifiant de l\'item est requis' });
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items/${itemId}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      },
    });

    const data = response.data;

    // Construire l'objet de sortie
    const formattedItem = {
      id: data.id,
      name: data.name,
      author: data.metadata['dc.contributor.author'] || [],
      dateAccessioned: data.metadata['dc.date.accessioned']?.[0]?.value || null,
      dateIssued: data.metadata['dc.date.issued']?.[0]?.value || null,
      description: data.metadata['dc.description']?.[0]?.value || null,
      provenance: data.metadata['dc.description.provenance'] || [],
      type: data.metadata['dc.type']?.[0]?.value || null,
      uri: data.metadata['dc.identifier.uri']?.[0]?.value || null,
      lng: data.metadata['dc.language.iso']?.[0]?.value || null,
      discipline: data.metadata['etd.degree.discipline']?.[0]?.value || null,
      level: data.metadata['etd.degree.level']?.[0]?.value || null,
      handle: data.handle,
      inArchive: data.inArchive,
      discoverable: data.discoverable,
      itemType: data.type,
      lastModified: data.lastModified,
    };

    res.json(formattedItem);
  } catch (error) {
    logger.error('Erreur lors de la récupération des détails de l\'item:', error.message);
    res.status(500).send({ error: 'Erreur lors de la récupération des détails de l\'item' });
  }
};


module.exports = {
  getUserItems,
  getUsers,
  getItemDetails
};
