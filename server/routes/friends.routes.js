const express = require('express');
const asyncHandler = require('../lib/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const controller = require('../controllers/friends.controller');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncHandler(controller.list));
router.get('/requests', asyncHandler(controller.requests));
router.post('/requests', asyncHandler(controller.sendRequest));
router.post('/requests/:id/accept', asyncHandler(controller.accept));
router.post('/requests/:id/decline', asyncHandler(controller.decline));
router.delete('/:userId', asyncHandler(controller.remove));
router.get('/:userId/profile', asyncHandler(controller.profile));

module.exports = router;
