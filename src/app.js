const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const firebaseConfig = require('../config/firebase');
const errorMiddleware = require('../middlewares/errorMiddleware');

const app = express();

// Routes
const authRoutes = require('../routes/authRoutes');
const imageRoutes = require('../routes/imageRoutes');
const chatRoutes = require('../routes/chatRoutes');

// Middlewares
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://practicepartner.ai');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

const corsOptions = {
  origin: ['http://localhost:3001', 'https://practicepartner.kaizenapps.com', 'https://practicepartner.ai', 'https://married-dolls-cashiers-puts.trycloudflare.com'], // Allow requests from this origin
  methods: 'GET,POST', // Allow only GET and POST requests
  allowedHeaders: 'Content-Type,Authorization', // Allow only these headers
};

app.use(cors(corsOptions));

// Routes
app.use('/api', authRoutes);
app.use('/api', imageRoutes);
app.use('/api', chatRoutes);

// PORT
const port = 3000;

// Starting a server
app.listen(port, () => {
  console.log(`app is running at ${port}`);
});

//
