const jwt = require('jsonwebtoken');
const User = require('../models/user');

module.exports = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ message: 'No token provided' });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded._id);
      if (!user) return res.status(401).json({ message: 'Invalid token or user not found' });

      // Attach user to req
      req.user = user;

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({ message: 'Forbidden: Insufficient role' });
      }

      next();
    } catch (err) {
      return res.status(403).json({ message: 'Forbidden: ' + err.message });
    }
  };
};
