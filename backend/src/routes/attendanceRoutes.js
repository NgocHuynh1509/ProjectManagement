const express = require('express');

const router = express.Router();

const attendanceController = require('../controllers/attendanceController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

const managerOnly = [verifyToken, authorizeRole(['manager'])];

// ============================================================
// SUMMARY
// ============================================================

router.get(
  '/summary',
  ...managerOnly,
  attendanceController.getAttendanceSummary
);

router.get(
  '/exceptions',
  ...managerOnly,
  attendanceController.getAttendanceExceptions
);

// ============================================================
// LOGS
// ============================================================

router.get(
  '/logs',
  ...managerOnly,
  attendanceController.getAttendanceLogs
);

// ============================================================
// RULE OPTIONS
// Đặt trước /:id
// ============================================================

router.get(
  '/rules/options',
  ...managerOnly,
  attendanceController.getAttendanceRuleOptions
);

// ============================================================
// RULES
// ============================================================

router.get(
  '/rules',
  ...managerOnly,
  attendanceController.getAttendanceRules
);

router.post(
  '/rules',
  ...managerOnly,
  attendanceController.createAttendanceRule
);

router.put(
  '/rules/:id',
  ...managerOnly,
  attendanceController.updateAttendanceRule
);

router.delete(
  '/rules/:id',
  ...managerOnly,
  attendanceController.deleteAttendanceRule
);

router.get('/shifts', ...managerOnly, attendanceController.getWorkShifts);
router.post('/shifts', ...managerOnly, attendanceController.createWorkShift);
router.put('/shifts/:id', ...managerOnly, attendanceController.updateWorkShift);
router.delete('/shifts/:id', ...managerOnly, attendanceController.deleteWorkShift);

router.get('/department-schedules', ...managerOnly, attendanceController.getDepartmentShiftSchedules);
router.post('/department-schedules', ...managerOnly, attendanceController.createDepartmentShiftSchedule);
router.delete('/department-schedules/:id', ...managerOnly, attendanceController.deleteDepartmentShiftSchedule);

router.get('/overtime', ...managerOnly, attendanceController.getOvertimeShifts);
router.post('/overtime', ...managerOnly, attendanceController.createOvertimeShift);
router.put('/overtime/:id/status', ...managerOnly, attendanceController.updateOvertimeStatus);
router.get('/overtime/:id/registrations', ...managerOnly, attendanceController.getOvertimeRegistrations);

router.post('/absent/scan', ...managerOnly, attendanceController.scanAbsent);
router.get('/scheduled-shifts', ...managerOnly, attendanceController.getScheduledShifts);

// ============================================================
// DEVICES
// ============================================================

router.get(
  '/devices',
  ...managerOnly,
  attendanceController.getAttendanceDevices
);

router.post(
  '/devices',
  ...managerOnly,
  attendanceController.createAttendanceDevice
);

// ============================================================
// MCC DEVICE
// ============================================================

router.post(
  '/device/push',
  attendanceController.receiveMCCAttendance
);

module.exports = router;