const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

// GET /api/employees/options
router.get('/options', employeeController.getEmployeeOptions);

// POST /api/employees
router.post('/', employeeController.createEmployee);

// GET /api/employees
router.get('/', employeeController.getAllEmployees);

// GET /api/employees/:id
router.get('/:id', employeeController.getEmployeeById);

module.exports = router;
