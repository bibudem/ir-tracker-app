const express = require('express');
const router = express.Router();
const rapportsController = require('../controllers/rapportsController');

router.get('/workflowitems', rapportsController.getWorkflowitems);

//router.get('/workspaceitems', rapportsController.getWorkspaceitems);


module.exports = router;
