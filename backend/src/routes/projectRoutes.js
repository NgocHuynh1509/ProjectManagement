const express = require('express');

const router = express.Router();

const projectController = require('../controllers/projectController');

// ============================================================
// PROJECT
// ============================================================

router.get('/', projectController.getAllProjects);

router.get('/options', projectController.getProjectOptions);

router.post('/', projectController.createProject);

router.get('/:id', projectController.getProjectById);

router.put('/:id', projectController.updateProject);

router.delete('/:id', projectController.deleteProject);

// ============================================================
// PHASE
// ============================================================

router.post(
  '/:id/phases',
  projectController.createPhase
);

router.put(
  '/:id/phases/:phaseId',
  projectController.updatePhase
);

router.delete(
  '/:id/phases/:phaseId',
  projectController.deletePhase
);

// ============================================================
// MEMBERS
// ============================================================

router.post(
  '/:id/members',
  projectController.addProjectMember
);

router.delete(
  '/:id/members/:employeeId',
  projectController.removeProjectMember
);

// ============================================================
// TASKS
// ============================================================

router.get(
  '/:id/tasks',
  projectController.getProjectTasks
);

router.post(
  '/:id/tasks',
  projectController.createTask
);

router.put(
  '/tasks/:taskId',
  projectController.updateTask
);

router.put(
  '/tasks/:taskId/status',
  projectController.updateTaskStatus
);

router.delete(
  '/tasks/:taskId',
  projectController.deleteTask
);

module.exports = router;
