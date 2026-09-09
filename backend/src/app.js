const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const employeePortalRoutes = require('./routes/employeePortalRoutes');
const projectRoutes = require('./routes/projectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const {
    verifyToken,
    authorizeRole
} = require('./middleware/authMiddleware');

// ============================================================
// AUTH
// ============================================================

app.use('/api/auth', authRoutes);


// ============================================================
// MANAGER
// ============================================================

// HR - Manager only
app.use(
    '/api/employees',
    verifyToken,
    authorizeRole(['manager']),
    employeeRoutes
);

// Projects - Manager only
app.use(
    '/api/projects',
    verifyToken,
    authorizeRole(['manager']),
    projectRoutes
);

// Attendance - Manager only
app.use(
    '/api/attendance',
    verifyToken,
    authorizeRole(['manager']),
    attendanceRoutes
);

// Dashboard - Manager only
app.use(
    '/api/dashboard',
    verifyToken,
    authorizeRole(['manager']),
    dashboardRoutes
);


// ============================================================
// EMPLOYEE
// ============================================================

app.use(
    '/api/employee',
    verifyToken,
    authorizeRole(['employee']),
    employeePortalRoutes
);


// ============================================================
// TEST ROUTES
// ============================================================

app.get('/', (req, res) => {
    res.json({
        message: 'Node.js + Supabase API is running!'
    });
});

app.get('/api/protected', verifyToken, (req, res) => {
    res.json({
        message: 'You have access to this protected route!',
        user: req.user
    });
});

app.get(
    '/api/manager-only',
    verifyToken,
    authorizeRole(['manager']),
    (req, res) => {
        res.json({
            message: 'Welcome to the manager dashboard.',
            user: req.user
        });
    }
);


// ============================================================
// SERVER
// ============================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});