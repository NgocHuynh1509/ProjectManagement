const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

// GET /api/attendance/summary?date=YYYY-MM-DD
router.get('/summary', attendanceController.getAttendanceSummary);
router.get('/logs', attendanceController.getAttendanceLogs);
router.get('/rules', attendanceController.getAttendanceRules);
router.post('/rules', attendanceController.createAttendanceRule);
router.get('/devices', attendanceController.getAttendanceDevices);
router.post('/devices', attendanceController.createAttendanceDevice);

module.exports = router;
