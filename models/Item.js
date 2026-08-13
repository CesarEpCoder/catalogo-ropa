const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['uniformes_clinicos', 'chaquetas']
    },
    gender: {
      type: String,
      required: true,
      enum: ['hombre', 'mujer']
    },
    size: { type: String, trim: true, default: '' },
    color: { type: String, trim: true, default: '' },
    price: { type: Number, default: 0, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: '' },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String, required: true }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', itemSchema);
