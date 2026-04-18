const express = require('express');
const Zone = require('../models/Zone');

module.exports = (io) => {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const zones = await Zone.find();
    res.json(zones);
  });

  router.post('/update', async (req, res) => {
    const { name, count } = req.body;

    let zone = await Zone.findOne({ name });
    if (!zone) {
      zone = new Zone({ name, count });
    } else {
      zone.count = count;
    }

    await zone.save();

    const allZones = await Zone.find();
    io.emit('zoneUpdate', allZones);

    if (count > 50) {
      io.emit('alert', { message: `${name} overcrowded!` });
    }

    res.json({ success: true });
  });

  return router;
};
