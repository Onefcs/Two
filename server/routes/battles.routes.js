const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/battles.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/dungeon-data', asyncHandler(controller.dungeonData));
router.post('/sync', asyncHandler(controller.sync));
router.post('/resolve', asyncHandler(controller.resolve));
router.post('/start', asyncHandler(controller.start));
router.post('/finish', asyncHandler(controller.finish));

module.exports = router;
