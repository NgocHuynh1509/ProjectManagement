const express = require('express');

const router = express.Router();

const attendanceController = require('../controllers/attendanceController');

// ============================================================
// SUMMARY
// ============================================================

router.get(
  '/summary',
  attendanceController.getAttendanceSummary
);

// ============================================================
// LOGS
// ============================================================

router.get(
  '/logs',
  attendanceController.getAttendanceLogs
);

// ============================================================
// RULE OPTIONS
// Đặt trước /:id
// ============================================================

router.get(
  '/rules/options',
  attendanceController.getAttendanceRuleOptions
);

// ============================================================
// RULES
// ============================================================

router.get(
  '/rules',
  attendanceController.getAttendanceRules
);

router.post(
  '/rules',
  attendanceController.createAttendanceRule
);

router.put(
  '/rules/:id',
  attendanceController.updateAttendanceRule
);

router.delete(
  '/rules/:id',
  attendanceController.deleteAttendanceRule
);

// ============================================================
// DEVICES
// ============================================================

router.get(
  '/devices',
  attendanceController.getAttendanceDevices
);

router.post(
  '/devices',
  attendanceController.createAttendanceDevice
);

module.exports = router;