const express = require('express');
const router = express.Router();

const userManagementController = require('../controllers/userManagementController');

// router.post('/user-management', userManagementController.editUser);
router.get('/user-management', userManagementController.getUsers);
router.post('/subscribe-email',userManagementController.subscribeEmail);
router.get('/profile',userManagementController.getProfileInfo);

module.exports = router;
