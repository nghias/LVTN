// server/src/routers/index.js
const express = require('express');
const router = express.Router();

const authRouter = require('./auth.router');
const phongTroRouter = require('./phongTro.router');
const khachThueRouter = require('./khachThue.route'); // hoặc './khachThue.router'

router.use('/auth', authRouter);
router.use('/phong-tro', phongTroRouter);
router.use('/khach-thue', khachThueRouter);

module.exports = router;