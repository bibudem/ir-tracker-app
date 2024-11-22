const axios = require('axios');
const FormData = require('form-data');
const config = require('../config/config');

const attemptLogin = async (req, res, next) => {
  try {
    // Étape 1 : Vérification de l'état d'authentification
    const csrfStatusResponse = await axios.get(`${config.DSPACE_API_URL}/authn/status`, {
      withCredentials: true,
      headers: {
        'Origin': 'http://localhost:3100',
        'Content-Type': 'application/json',
        'Authorization': req.headers['authorization'],
      },
    });

    //console.log('Réponse statut authn:', csrfStatusResponse.data);

    if (csrfStatusResponse.data.authenticated) {
      req.dspaceAuthToken = csrfStatusResponse.headers['authorization'];
      req.dspaceCookies = csrfStatusResponse.headers['set-cookie']?.join('; ');
      return next();
    }

    // Sinon, récupérer le token CSRF et les cookies
    const csrfTokenResponse = await axios.get(`${config.DSPACE_API_URL}/security/csrf`, {
      withCredentials: true,
      headers: {
        'Origin': 'http://localhost:3100',
        'Content-Type': 'application/json',
      },
    });

    const csrfToken = csrfTokenResponse.headers['dspace-xsrf-token'];
    const cookies = csrfTokenResponse.headers['set-cookie'];

    if (!csrfToken || !cookies) {
      console.error('Erreur: Impossible de récupérer le token CSRF ou les cookies.');
      throw new Error('En-têtes incomplets.');
    }

    //console.log('Token CSRF:', csrfToken);
    //console.log('Cookies:', cookies);

    // Étape 2 : Connexion avec le token CSRF
   // console.log('Envoi de la requête de connexion...');
    const formData = new FormData();
    formData.append('user', config.DSPACE_USERNAME);
    formData.append('password', config.DSPACE_PASSWORD);

    const loginResponse = await axios.post(
      `${config.DSPACE_API_URL}/authn/login`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Origin': config.API_IR_TRACKER,
          'X-XSRF-Token': csrfToken,
          'Cookie': cookies?.join('; '),
        },
        withCredentials: true,
      }
    );

    req.dspaceAuthToken = loginResponse.headers['authorization'];
    req.dspaceCookies = loginResponse.headers['set-cookie']?.join('; ');

    if (req.dspaceAuthToken) {
      console.log('Connexion réussie, token reçu:', req.dspaceAuthToken);
      return next();
    } else {
      console.error("Erreur: Token d'authentification non reçu après connexion.");
      throw new Error("Token d'authentification non reçu après connexion.");
    }
  } catch (error) {
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
