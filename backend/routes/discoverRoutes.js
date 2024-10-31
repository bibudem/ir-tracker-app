const express = require('express');
const router = express.Router();
const discoverController = require('../controllers/discoverController');

// Route pour récupérer les collections
router.get('', discoverController.getDiscover);

module.exports = router;
