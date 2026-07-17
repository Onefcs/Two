const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/battles.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.post('/resolve', asyncHandler(controller.resolve));

module.exports = router;
