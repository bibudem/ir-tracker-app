const express = require('express');
const router = express.Router();
const rapportsController = require('../controllers/rapportsController');

router.get('/itemsRapport', rapportsController.getWorkflowitems);
// Rapport "TME en attente" (ajouté le 2026-09-08)
router.get('/theses-en-attente', rapportsController.getWorkspaceThesesRapport);

module.exports = router;
