const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const store = new session.MemoryStore();
const jwt = require('jsonwebtoken');

// Configure express-session middleware
const sessionMiddleware = session({
  genid: (req) => {
    return uuidv4(); // Generate unique session IDs
  },
  secret: 'e04e8fab-c337-48bb-be63-d1c23b891be6', // Replace with your actual session secret
  resave: false,
  saveUninitialized: false,
  store,
  cookie: { secure: false, path: '/' }, // Set secure to true if your app uses HTTPS
});


const requireAuth = (req, res, next) => {
  const token = req.cookies && req.cookies['jwt'];

  if (token) {
    jwt.verify(token, process.env.JWT_KEY, (err, decodedToken) => {
      if (err) {
        // console.log(err.message);
        res.status(401).json({ error: 'Unauthorized' });
      } else {
        console.log(decodedToken);
        next();
      }
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};




module.exports = requireAuth;

// module.exports = { sessionMiddleware, store, authMiddleware };


