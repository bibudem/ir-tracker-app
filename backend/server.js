const express = require('express');
const cors = require('cors');
const collectionRoutes = require('./routes/collectionRoutes');
const discoverRoutes = require('./routes/discoverRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const dspaceAuthMiddleware = require('./middlewares/authMiddleware'); // Ajoutez ce middleware
const errorMiddleware = require('./middlewares/errorMiddleware');
const config = require('./config/config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Utiliser le middleware d'authentification pour toutes les requêtes vers DSpace
app.use(dspaceAuthMiddleware);

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
