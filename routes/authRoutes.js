const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  logout,
  forgetPassword,
  authenticate
} = require('../controllers/authController');

router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);

router.post('/forget-password', forgetPassword);

router.get('/authenticate',authenticate);

module.exports = router;
