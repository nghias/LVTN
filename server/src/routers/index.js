// server/src/routers/index.js
const express = require('express');
const router = express.Router();

const authRouter = require('./auth.router');
const phongTroRouter = require('./phongTro.router');
const khachThueRouter = require('./khachThue.router');
const tienIchRouter = require('./tienIch.router');
const tinDangRouter = require('./tinDang.router');
const dichVuRouter = require('./dichVu.router');
const dienNuocRouter = require('./dienNuoc.router');
const hoaDonRouter = require('./hoaDon.router');



router.use('/auth', authRouter);
router.use('/phong-tro', phongTroRouter);
router.use('/khach-thue', khachThueRouter);
router.use('/tien-ich', tienIchRouter);
router.use('/tin-dang', tinDangRouter);
router.use('/dich-vu', dichVuRouter);
router.use('/dien-nuoc', dienNuocRouter);
router.use('/hoa-don', hoaDonRouter);


module.exports = router;