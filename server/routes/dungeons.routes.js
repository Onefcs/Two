const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/dungeons.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/', asyncHandler(controller.list));
router.post('/:id/enter', asyncHandler(controller.enter));
router.post('/:id/boss', asyncHandler(controller.bossBattle));

module.exports = router;
