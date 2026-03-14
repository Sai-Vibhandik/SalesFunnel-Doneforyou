const express = require('express');
const router = express.Router();
const {
  getLandingPage,
  upsertLandingPage,
  addNurturing,
  removeNurturing
} = require('../controllers/landingPageController');
const { protect, authorize } = require('../middleware/auth');

// All routes are protected and require admin or performance_marketer role
router.use(protect);
router.use(authorize('admin', 'performance_marketer'));

// Landing page routes
router.route('/:projectId')
  .get(getLandingPage)
  .post(upsertLandingPage);

// Nurturing routes
router.post('/:projectId/nurturing', addNurturing);
router.delete('/:projectId/nurturing/:nurturingId', removeNurturing);

module.exports = router;