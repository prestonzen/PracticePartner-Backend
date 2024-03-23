const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

// Configure express-session middleware
const sessionMiddleware = session({
  genid: (req) => {
    return uuidv4(); // Generate unique session IDs
  },
  secret: 'e04e8fab-c337-48bb-be63-d1c23b891be6', // Replace with your actual session secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, path: '/' }, // Set secure to true if your app uses HTTPS
});

module.exports = sessionMiddleware;
