const express = require('express');
const multer = require('multer');
const Item = require('../models/Item');
const { requireAdmin } = require('../middleware/auth');
const { uploadBuffer, deleteImage } = require('../utils/cloudinary');

const router = express.Router();

const MAX_IMAGES = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_IMAGES }, // 5MB máx por imagen
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('El archivo debe ser una imagen.'));
    }
    cb(null, true);
  }
});

const CATEGORIES = ['uniformes_clinicos', 'chaquetas'];
const GENDERS = ['hombre', 'mujer'];

// ---------- PÚBLICO: sin login, solo lectura ----------

// Lista de prendas, filtrable por categoría y género (para el drill-down)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.gender) filter.gender = req.query.gender;

    const items = await Item.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo cargar el catálogo.' });
  }
});

// Detalle de una prenda
router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).lean();
    if (!item) return res.status(404).json({ error: 'Prenda no encontrada.' });
    res.json({ item });
  } catch (e) {
    res.status(404).json({ error: 'Prenda no encontrada.' });
  }
});

// ---------- ADMIN: requiere sesión válida ----------

router.post('/', requireAdmin, upload.array('images', MAX_IMAGES), async (req, res) => {
  try {
    const { name, category, gender, size, color, price, stock, notes } = req.body;

    if (!name || !CATEGORIES.includes(category) || !GENDERS.includes(gender)) {
      return res.status(400).json({ error: 'Nombre, categoría y género son obligatorios.' });
    }

    const files = req.files || [];
    const uploaded = await Promise.all(files.map((f) => uploadBuffer(f.buffer)));
    const images = uploaded.map((r) => ({ url: r.secure_url, publicId: r.public_id }));

    const item = await Item.create({
      name,
      category,
      gender,
      size,
      color,
      price: Number(price) || 0,
      stock: Number(stock) || 0,
      notes,
      images
    });

    res.status(201).json({ item });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo guardar la prenda.' });
  }
});

router.put('/:id', requireAdmin, upload.array('images', MAX_IMAGES), async (req, res) => {
  try {
    const existing = await Item.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Prenda no encontrada.' });

    const { name, category, gender, size, color, price, stock, notes, keepImages } = req.body;

    if (name !== undefined) existing.name = name;
    if (category !== undefined) {
      if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Categoría inválida.' });
      existing.category = category;
    }
    if (gender !== undefined) {
      if (!GENDERS.includes(gender)) return res.status(400).json({ error: 'Género inválido.' });
      existing.gender = gender;
    }
    if (size !== undefined) existing.size = size;
    if (color !== undefined) existing.color = color;
    if (price !== undefined) existing.price = Number(price) || 0;
    if (stock !== undefined) existing.stock = Number(stock) || 0;
    if (notes !== undefined) existing.notes = notes;

    // keepImages: JSON array de publicId de las fotos existentes que se conservan.
    // Si no viene, se conservan todas las que ya tenía.
    let keepIds = null;
    if (keepImages !== undefined) {
      try { keepIds = JSON.parse(keepImages); } catch (e) { keepIds = []; }
    }

    if (Array.isArray(keepIds)) {
      const toDelete = existing.images.filter((img) => !keepIds.includes(img.publicId));
      const toKeep = existing.images.filter((img) => keepIds.includes(img.publicId));
      await Promise.all(toDelete.map((img) => deleteImage(img.publicId)));
      existing.images = toKeep;
    }

    const files = req.files || [];
    if (files.length) {
      const remainingSlots = MAX_IMAGES - existing.images.length;
      const toUpload = files.slice(0, Math.max(remainingSlots, 0));
      const uploaded = await Promise.all(toUpload.map((f) => uploadBuffer(f.buffer)));
      existing.images.push(...uploaded.map((r) => ({ url: r.secure_url, publicId: r.public_id })));
    }

    await existing.save();
    res.json({ item: existing });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo actualizar la prenda.' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const existing = await Item.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Prenda no encontrada.' });

    await Promise.all((existing.images || []).map((img) => deleteImage(img.publicId)));
    await existing.deleteOne();

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo eliminar la prenda.' });
  }
});

module.exports = router;