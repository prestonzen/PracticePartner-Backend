const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// Endpoint for initiating a streamed chat
router.post('/chat', chatController.startChat);

module.exports = router;
