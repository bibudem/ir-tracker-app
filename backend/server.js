const express = require('express');
const cors = require('cors');
const collectionRoutes = require('./routes/collectionRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');
const config = require('./config/config');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Si vous avez besoin de traiter les JSON

// Routes
app.use('/api/collections', collectionRoutes);

// Middleware d'erreur
app.use(errorMiddleware);

// Démarrer le serveur
app.listen(config.PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${config.PORT}`);
});
