const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middlewares/sessionMiddleware')
// Endpoint for initiating a streamed chat
router.post('/chat', chatController.startChat);
router.get('/chat', chatController.getChat);

module.exports = router;
