const express = require('express');
const router = express.Router();
const authRouter = require('./auth.router');

// Gắn route xác thực
router.use('/auth', authRouter);


module.exports = router;