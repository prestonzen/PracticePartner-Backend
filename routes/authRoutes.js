const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  forgetPassword,
} = require('../controllers/authController');

router.post('/signup', signup);

router.post('/login', login);

router.post('/forget-password', forgetPassword);

module.exports = router;
