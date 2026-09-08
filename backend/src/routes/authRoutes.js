const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken, authorizeRole } = require('../middleware/authMiddleware');

// Authentication routes
router.post('/register', verifyToken, authorizeRole(['manager']), authController.register);
router.post('/login', authController.login);

module.exports = router;
