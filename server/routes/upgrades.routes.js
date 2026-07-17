const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/upgrades.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/', asyncHandler(controller.list));
router.post('/purchase', asyncHandler(controller.purchase));

module.exports = router;
