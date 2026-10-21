const express = require('express');
const router = express.Router();
const AuthController = require('../app/controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Public routes (Ai cũng gọi được)
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

// Protected routes (Phải đăng nhập mới gọi được)
router.get('/me', verifyToken, AuthController.getMe);
router.put('/change-password', verifyToken, AuthController.changePassword);

module.exports = router;