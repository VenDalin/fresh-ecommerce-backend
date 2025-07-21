const jwt = require('jsonwebtoken')
const User = require('../models/user')

module.exports = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'Unauthorized: No token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default_secret')
    const user = await User.findById(decoded._id)
    if (!user) return res.status(401).json({ message: 'Unauthorized: User not found' })

    req.user = user
    next()
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized', error: err.message })
  }
}
