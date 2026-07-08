module.exports = (config, logger) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (config.laravelApiKey && apiKey !== config.laravelApiKey) {
      return res.status(401).json({ success: false, error: 'Invalid API key' });
    }

    next();
  };
};
