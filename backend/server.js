const express = require('express');
const cors = require('cors');
const collectionRoutes = require('./routes/collectionRoutes');
const discoverRoutes = require('./routes/discoverRoutes');
const itemsRoutes = require('./routes/itemsRoutes');
const epersonsRoutes = require('./routes/epersonsRoutes');
const rapportsRoutes = require('./routes/rapportsRoutes');
const homeRoutes = require('./routes/homeRoutes');
const dspaceAuthMiddleware = require('./middlewares/authMiddleware'); // Ajoutez ce middleware
const errorMiddleware = require('./middlewares/errorMiddleware');
const config = require('./config/config');
const session = require('express-session');  // Importation de session
const MemoryStore = require('memorystore')(session);
const bodyParser = require('body-parser');
//const passport = require('./auth/auth');

const app = express();



const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(session({
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: 'ffpuJXq6xiotFWfOkQ8zdd5o8PbhWP8*&',
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended : true }));
//app.use(passport.initialize());
//app.use(passport.session());


app.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Erreur lors de la déconnexion :', err);
      return res.status(500).send({ message: 'Erreur lors de la déconnexion' });
    }
    req.session.destroy(() => {
      res.clearCookie('connect.sid');
      res.redirect('/login');
      //res.send({ message: 'User logout' });
    });
  });
});

app.get('/auth/status', (req, res) => {
    res.json({
      authenticated: true,
      user: req.user
    })
});

// Middleware
app.use(cors());
app.use(express.json());

// Utiliser le middleware d'authentification pour toutes les requêtes vers DSpace
app.use(dspaceAuthMiddleware);

// Routes
app.use('/collections', collectionRoutes);
app.use('/discover/objects', discoverRoutes);
app.use('/items', itemsRoutes);
app.use('/eperson', epersonsRoutes);
app.use('/rapports', rapportsRoutes);
app.use('/home', homeRoutes);

// Middleware d'erreur
app.use(errorMiddleware);

// Démarrer le serveur
app.listen(config.PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${config.PORT}`);
});
