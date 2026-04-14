const express = require('express');
const router = express.Router();
const epersonsController = require('../controllers/epersonsController');

router.get('/epersons/search', epersonsController.getUsers);

router.get('/items', epersonsController.getUserItems);

router.get('/item/details', epersonsController.getItemDetails);


module.exports = router;
