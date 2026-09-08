const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');

// GET /api/projects
router.get('/', projectController.getAllProjects);

// GET /api/projects/:id
router.get('/:id', projectController.getProjectById);

// GET /api/projects/:id/tasks
router.get('/:id/tasks', projectController.getProjectTasks);

// PUT /api/tasks/:taskId/status
router.put('/tasks/:taskId/status', projectController.updateTaskStatus);

module.exports = router;
