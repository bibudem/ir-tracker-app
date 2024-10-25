const errorMiddleware = (err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Erreur interne du serveur',
  });
};

module.exports = errorMiddleware;
