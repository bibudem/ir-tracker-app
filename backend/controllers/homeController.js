const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const getStatistiques = async (req, res) => {
  try {
    const usersResponse = await axios.get(`${config.DSPACE_API_URL}/eperson/epersons`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });

    const collectionsResponse = await axios.get(`${config.DSPACE_API_URL}/core/collections`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });

    const itemsResponse = await axios.get(`${config.DSPACE_API_URL}/core/items`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });

    const communitiesResponse = await axios.get(`${config.DSPACE_API_URL}/core/communities`, {
      headers: {
        'Authorization': req.dspaceAuthToken,
        'Cookie': req.dspaceCookies,
      }
    });

    res.json({
      users: usersResponse.data.page.totalElements,
      collections: collectionsResponse.data.page.totalElements,
      items: itemsResponse.data.page.totalElements,
      communities: communitiesResponse.data.page.totalElements,
    });
  } catch (error) {
    logger.error('Erreur lors de la récupération des statistiques:', error.message);
    res.status(500).send('Erreur lors de la récupération des statistiques.');
  }
};


module.exports = {
  getStatistiques
};
