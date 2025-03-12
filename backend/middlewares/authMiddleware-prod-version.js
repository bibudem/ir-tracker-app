const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

// Fonction pour récupérer le jeton CSRF à partir des cookies de la requête
const getCSRFToken = (cookieHeader) => {
  if (cookieHeader) {
    const result = cookieHeader.toString().split('=')[1];
    return result.toString().split(';')[0];
  }
  return null;
};

const attemptLogin = async (req, res, next) => {
  try {
    // Étape 1 : Vérification de l'état d'authentification
    const csrfStatusResponse = await axios.get(`${config.DSPACE_API_URL}/authn/status`, {
      withCredentials: true,
      headers: {
        'Origin': config.API_IR_TRACKER,
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'],
      },
    });

    // Vérifiez si l'utilisateur est déjà authentifié
    if (csrfStatusResponse.data.authenticated) {
      req.dspaceAuthToken = csrfStatusResponse.headers['authorization'];
      req.dspaceCookies = csrfStatusResponse.headers['set-cookie'];
      return next();
    }

    // Étape 2 : Récupérer le jeton CSRF du cookie
    const csrfToken = getCSRFToken(csrfStatusResponse.headers['set-cookie']);
    const cookies = csrfStatusResponse.headers['set-cookie'];

    if (!csrfToken) {
      console.error('Erreur: Impossible de récupérer le token CSRF.');
      throw new Error('En-têtes incomplets : token CSRF manquant.');
    }

    // Étape 3 : Connexion avec le token CSRF
    const formData = new FormData();
    formData.append('user', config.DSPACE_USERNAME);
    formData.append('password', config.DSPACE_PASSWORD);

    // Effectuer la requête de connexion
    const loginResponse = await axios.post(
      `${config.DSPACE_API_URL}/authn/login`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': config.API_IR_TRACKER,
          'X-XSRF-Token': csrfToken,
          'Cookie': cookies,
        },
        withCredentials: true, // Permet d'inclure les cookies dans les requêtes
      }
    );

    // Assigner les cookies et le token d'authentification
    req.dspaceAuthToken = loginResponse.headers['authorization'];
    req.dspaceCookies = loginResponse.headers['set-cookie'];

    // Vérifier que le token d'authentification a été reçu
    if (req.dspaceAuthToken) {
      console.log('Connexion réussie, token reçu:', req.dspaceAuthToken);
      return next();
    } else {
      console.error("Erreur: Token d'authentification non reçu après connexion.");
      throw new Error("Token d'authentification non reçu après connexion.");
    }
  } catch (error) {
    // Log des erreurs pour faciliter le dépannage
    console.error('Erreur lors de la connexion à DSpace:', error.message);

    if (error.response) {
      console.error('Détails de la réponse:', error.response.data);
    }

    res.status(500).json({
      message: 'Erreur de connexion à DSpace',
      details: error.message,
    });
  }
};

module.exports = attemptLogin;
