const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema({
  name: String,
  count: Number,
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Zone', zoneSchema);
