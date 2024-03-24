const express = require('express');
const router = express.Router();

const userManagementController = require('../controllers/userManagementController');

// router.post('/user-management', userManagementController.editUser);
router.get('/user-management', userManagementController.getUsers);

module.exports = router;
