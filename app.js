const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const firebaseConfig = require('./config/firebase');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();

// Routes
const authRoutes = require('./routes/authRoutes');
const imageRoutes = require('./routes/imageRoutes');
const chatRoutes = require('./routes/chatRoutes');

// Middlewares
app.use(bodyParser.json());

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
