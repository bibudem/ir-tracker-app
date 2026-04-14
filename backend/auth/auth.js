"use strict";
const passport = require("passport");
const AzureOAuth2Strategy = require("passport-azure-oauth2");
const jwt = require("jwt-simple");
const config = require('../config/config');

passport.use("azure_ad_oauth2", new AzureOAuth2Strategy({
    clientID: config.AZURE_AD_CLIENT_ID,
    clientSecret: config.AZURE_AD_CLIENT_SECRET,
    callbackURL: config.AZURE_CALLBACK_URL,
    scope: 'openid profile',
    response_type: 'code',
    origin: "Application",
    state: false
  },
  function (accessToken, refreshToken, params, profile, done) {
    // Décoder le jeton d'identité et récupérer les informations utilisateur
    try {
      let user = jwt.decode(params.id_token, "name", true);
      //console.log("Decoded User:", user); // Log de l'utilisateur décodé
      done(null, user);
    } catch (error) {
      console.error("Erreur lors du décodage du jeton JWT:", error);
      done(error, null);
    }
  }
));

// Sérialisation et désérialisation de l'utilisateur pour la session
passport.serializeUser((user, done) => {
  //console.log("Serialize User:", user);
  done(null, user);
});

passport.deserializeUser((user, done) => {
  //console.log("Deserialize User:", user);
  done(null, user);
});

module.exports = passport;
