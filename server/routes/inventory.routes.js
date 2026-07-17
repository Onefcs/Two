const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth, requireCharacter } = require('../middleware/auth');
const controller = require('../controllers/inventory.controller');

const router = express.Router();
router.use(requireAuth, requireCharacter);

router.get('/', asyncHandler(controller.list));
router.post('/equip', asyncHandler(controller.equip));
router.post('/unequip', asyncHandler(controller.unequip));
router.post('/:id/sell', asyncHandler(controller.sell));

module.exports = router;
