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
  const userId = req.query.userId; // UUID de l'utilisateur
  if (!userId) {
    return res.status(400).send({ error: 'Le paramètre userId est requis' });
  }

  try {
    const response = await axios.get(`${config.DSPACE_API_URL}/core/items?submitter=${userId}`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      },
    });
    console.log(response.data._embedded.items);
    const items = response.data._embedded.items.map(item => ({
      id: item.uuid,
      title: item.metadata['dc.title']?.[0]?.value || 'Titre non disponible',
      date: item.metadata['dc.date.issued']?.[0]?.value || 'Date non disponible',
    }));

    res.json({ items });
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
