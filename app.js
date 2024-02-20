const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const firebaseConfig = require('./config/firebase');
const imageRoutes = require('./routes/imageRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Routes
const authRoutes = require('./routes/authRoutes');

// Middlewares
app.use(bodyParser.json());

// Routes
app.use('/api', authRoutes);
app.use('/api', imageRoutes);

// PORT
const port = 3000;

// Starting a server
app.listen(port, () => {
  console.log(`app is running at ${port}`);
});

//
