module.exports = function (requiredRole) {
  return function (req, res, next) {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        message: "Access denied: " + requiredRole + "s only",
      });
    }
    next();
  };
};
