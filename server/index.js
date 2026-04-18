const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const zoneRoutes = require('./routes/zoneRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/crowdDB')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));

app.use('/api/zones', zoneRoutes(io));

io.on('connection', (socket) => {
  console.log('User connected');
});

server.listen(5000, () => console.log('Server running on 5000'));
