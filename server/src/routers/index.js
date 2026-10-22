const express = require('express');
const router = express.Router();
const authRouter = require('./auth.router');
const phongTroRouter = require('./phongTro.router');

router.use('/auth', authRouter);
router.use('/phong-tro', phongTroRouter);


module.exports = router;