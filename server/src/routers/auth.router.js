const express = require('express');
const router = express.Router();
const AuthController = require('../app/controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Public routes (Ai cũng gọi được)
router.post('/login', AuthController.login);
router.post('/logout', AuthController.logout);

router.post('/forgot-password/send-otp', AuthController.sendForgotPasswordOtp);
router.post('/forgot-password/verify-otp', AuthController.verifyForgotPasswordOtp);
router.post('/forgot-password/reset', AuthController.resetPasswordWithOtp);

// Protected routes (Phải đăng nhập mới gọi được)
router.get('/me', verifyToken, AuthController.getMe);
router.put('/change-password', verifyToken, AuthController.changePassword);
router.get('/profile', verifyToken, AuthController.getProfile.bind(AuthController));
router.put('/profile', verifyToken, AuthController.updateProfile.bind(AuthController));

module.exports = router;