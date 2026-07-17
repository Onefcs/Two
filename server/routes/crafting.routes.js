const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/crafting.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/recipes', asyncHandler(controller.list));
router.post('/craft', asyncHandler(controller.craft));

module.exports = router;
