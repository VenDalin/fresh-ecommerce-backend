const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (req.user.role === "superadmin") return next();

    if (!req.user.permissions || !req.user.permissions.includes(requiredPermission)) {
      return res.status(403).json({ message: `Permission denied: ${requiredPermission}` });
    }

    next();
  };
};

module.exports = checkPermission;
//Sakmakmol