const express = require('express');
const router = express.Router();
const rapportsController = require('../controllers/rapportsController');

router.get('/itemsRapport', rapportsController.getWorkflowitems);


module.exports = router;
