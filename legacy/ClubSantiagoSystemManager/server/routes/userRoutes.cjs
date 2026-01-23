const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController.cjs');

router.post('/login', userController.login);
router.get('/', userController.getUsers);
router.post('/', userController.createUser);

module.exports = router;
