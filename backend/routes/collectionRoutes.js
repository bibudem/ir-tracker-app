const express = require('express');
const router = express.Router();
const collectionController = require('../controllers/collectionController');

// Route pour récupérer les collections
router.get('/', collectionController.getCollections);

module.exports = router;