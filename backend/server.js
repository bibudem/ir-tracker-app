const express = require('express');
const cors = require('cors');
const collectionRoutes = require('./routes/collectionRoutes');
const discoverRoutes = require('./routes/discoverRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const config = require('./config/config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Si vous avez besoin de traiter les JSON

// Routes
app.use('/collections', collectionRoutes);

app.use('/discover/objects', discoverRoutes);

app.use('/items', itemsRoutes);

// Middleware d'erreur
app.use(errorMiddleware);

// Démarrer le serveur
app.listen(config.PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${config.PORT}`);
});
