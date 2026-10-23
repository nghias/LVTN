const express = require('express');
const router = express.Router();
const TinDangController = require('../app/controllers/tinDang.controller');

router.get('/', TinDangController.getList);
router.post('/', TinDangController.create);
router.put('/:maTin', TinDangController.update);
router.delete('/:maTin', TinDangController.remove);

module.exports = router;