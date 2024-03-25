const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
const store = new session.MemoryStore();

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


const authMiddleware = (req,res,next) => {
  const token = req.cookies && req.cookies['jwt'];

  if(token){
    console.log(token);
    next();
  }
  else{
    // console.log(token);
    res.redirect('http://localhost:3001/login');
  }
}

module.exports = authMiddleware;

// module.exports = { sessionMiddleware, store, authMiddleware };


