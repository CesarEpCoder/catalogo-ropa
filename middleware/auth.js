const jwt = require('jsonwebtoken');

function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'No autenticado.' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') throw new Error('rol inválido');
    req.admin = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida o expirada.' });
  }
}

module.exports = { requireAdmin };
