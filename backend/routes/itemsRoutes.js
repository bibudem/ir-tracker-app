const express = require('express');
const router = express.Router();
const itemsController = require('../controllers/itemsController');

// Route pour récupérer les collections
router.get('', itemsController.getMappedCollections);

module.exports = router;
