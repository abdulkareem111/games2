const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];
  // If header starts with "Bearer ", extract token; otherwise use it as-is
  const token = authHeader && authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}

module.exports = { authenticateToken };