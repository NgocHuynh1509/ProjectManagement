const express = require('express');
const router = express.Router();
const controller = require('../controllers/employeePortalController');

router.get('/dashboard', controller.getDashboard);

router.get('/profile', controller.getMyProfile);
router.put('/profile', controller.updateMyProfile);

router.post('/profile/qualifications', controller.createQualification);
router.put('/profile/qualifications/:id', controller.updateQualification);
router.delete('/profile/qualifications/:id', controller.deleteQualification);

router.post('/profile/certificates', controller.createCertificate);
router.put('/profile/certificates/:id', controller.updateCertificate);
router.delete('/profile/certificates/:id', controller.deleteCertificate);

router.post('/profile/experiences', controller.createExperience);
router.put('/profile/experiences/:id', controller.updateExperience);
router.delete('/profile/experiences/:id', controller.deleteExperience);

router.get('/attendance', controller.getMyAttendance);

router.get('/schedule', controller.getMySchedule);
router.put('/schedule', controller.updateMySchedule);
router.post('/schedule/confirm', controller.confirmMySchedule);
router.get('/overtime', controller.getMyOvertimeShifts);
router.post('/overtime/:id/register', controller.registerMyOvertime);
router.delete('/overtime/:id/register', controller.cancelMyOvertime);

router.get('/tasks', controller.getMyTasks);
router.get('/tasks/:taskId', controller.getMyTaskById);
router.put('/tasks/:taskId/status', controller.updateMyTaskStatus);
router.post('/tasks/:taskId/comments', controller.addTaskComment);
router.post('/tasks/:taskId/links', controller.addTaskLink);
router.delete('/tasks/:taskId/links/:linkId', controller.deleteTaskLink);

router.get('/projects', controller.getMyProjects);
router.get('/projects/:projectId', controller.getMyProjectById);

router.get('/leave', controller.getMyLeaveRequests);
router.post('/leave', controller.createLeaveRequest);
router.delete('/leave/:id', controller.cancelLeaveRequest);

module.exports = router;
