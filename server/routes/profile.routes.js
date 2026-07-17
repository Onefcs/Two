const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/profile.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/', asyncHandler(controller.get));

module.exports = router;
