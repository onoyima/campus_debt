module.exports = (logger) => {
  return (err, req, res, next) => {
    logger.error('Unhandled error', { error: err.message, stack: err.stack, method: req.method, url: req.url });

    if (res.headersSent) return next(err);

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
};
