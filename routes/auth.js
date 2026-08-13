const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Máximo 8 intentos de login cada 15 minutos por IP, para frenar fuerza bruta.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Falta usuario o contraseña.' });
  }

  const validUser = username === process.env.ADMIN_USERNAME;
  const validPass = validUser
    ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
    : false;

  // Siempre comparamos aunque el usuario esté mal, para no filtrar por tiempo de respuesta
  // si el usuario existe o no.
  if (!validUser || !validPass) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }

  const token = jwt.sign({ role: 'admin', username }, process.env.JWT_SECRET, {
    expiresIn: '12h'
  });

  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 12 * 60 * 60 * 1000
  });

  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  res.clearCookie('admin_token');
  res.json({ ok: true });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ ok: true, username: req.admin.username });
});

module.exports = router;
