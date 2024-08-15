const express = require('express');
const router = express.Router();

const {
  signup,
  login,
  logout,
  forgetPassword,
  authenticate,
  checkAndStoreUser,
  verifyEmail,
  testing
} = require('../controllers/authController');

router.post('/signup', signup);

router.post('/login', login);

router.post('/logout', logout);
router.post('/checkAndStoreUser', checkAndStoreUser);
router.get('/verify', verifyEmail);

router.post('/forget-password', forgetPassword);

router.get('/authenticate', authenticate);
router.get('/', testing);

module.exports = router;
