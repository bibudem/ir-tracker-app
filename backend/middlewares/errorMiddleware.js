const errorMiddleware = async (err, req, res, next) => {
  if (err instanceof Error) {
    res.status(500).json({ message: 'Erreur interne du serveur', details: err.message });
  } else if (err.response) {
    res.status(err.response.status).json({ message: err.response.statusText, details: err.response.data });
  } else {
    res.status(500).json({ message: 'Erreur inconnue', details: 'Erreur non spécifiée' });
  }
};

module.exports = errorMiddleware;
