// middlewares/authMiddleware.js
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

const dspaceAuthMiddleware = async (req, res, next) => {
  try {
    if (req.dspaceAuthToken) {
      console.log('Token déjà présent dans la requête:', req.dspaceAuthToken);
      return next();
    }

    const authUrl = `${config.DSPACE_API_URL}/authn/login`;
    console.log(`Tentative d'authentification à l'URL: ${authUrl}`);

    // Envoi de la requête POST avec gestion des cookies
    const loginResponse = await axios.post(
      authUrl,
      new URLSearchParams({
        user: config.DSPACE_USERNAME,
        password: config.DSPACE_PASSWORD,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        withCredentials: true,
      }
    );

    // Récupération des cookies de session
    const cookies = loginResponse.headers['set-cookie'];
    if (cookies) {
      req.dspaceCookies = cookies.join('; ');
      console.log('Cookies de session récupérés:', req.dspaceCookies);
    }

    const authToken = loginResponse.headers['authorization'];

    if (authToken) {
      console.log('Authentification réussie, token reçu:', authToken);
      req.dspaceAuthToken = authToken;
      next();
    } else {
      console.error("Erreur : Token d'authentification non reçu.");
      logger.error("Erreur : Token d'authentification non reçu.");
      res.status(500).json({ message: "Erreur lors de l'authentification avec DSpace." });
    }
  } catch (error) {
    console.error('Erreur lors de la tentative de connexion avec DSpace:', error.message);
    console.error('Détails de l\'erreur:', error.response ? error.response.data : error);
    logger.error('Erreur lors de la tentative de connexion avec DSpace:', error.message);
    logger.error('Détails de l\'erreur:', error.response ? JSON.stringify(error.response.data) : error.message);
    res.status(500).json({ message: 'Erreur de connexion à DSpace', details: error.response ? error.response.data : error.message });
  }
};

module.exports = dspaceAuthMiddleware;
