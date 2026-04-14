const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Route pour récupérer les statistiques

router.get('/statistics', homeController.getStatistiques);

module.exports = router;
