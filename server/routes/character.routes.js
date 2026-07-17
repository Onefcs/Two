const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/character.controller');

const router = express.Router();
router.use(requireAuth);

router.post('/', asyncHandler(controller.create));
router.get('/', requireCharacter, asyncHandler(controller.get));
router.post('/reroll', asyncHandler(controller.reroll));

module.exports = router;
