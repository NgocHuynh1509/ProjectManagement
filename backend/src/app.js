const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const projectRoutes = require('./routes/projectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const { verifyToken, authorizeRole } = require('./middleware/authMiddleware');

app.use('/api/auth', authRoutes);
app.use('/api/employees', verifyToken, authorizeRole(['manager']), employeeRoutes);
app.use('/api/projects', verifyToken, authorizeRole(['manager']), projectRoutes);
app.use('/api/attendance', verifyToken, authorizeRole(['manager']), attendanceRoutes);
app.use('/api/dashboard', verifyToken, authorizeRole(['manager']), dashboardRoutes);

app.get('/', (req, res) => {
    res.json({
        message: 'Node.js + Supabase API is running!'
    });
});

// Example protected route (employee and manager can access)
app.get('/api/protected', verifyToken, (req, res) => {
    res.json({ message: 'You have access to this protected route!', user: req.user });
});

// Example manager-only route
app.get('/api/manager-only', verifyToken, authorizeRole(['manager']), (req, res) => {
    res.json({ message: 'Welcome to the manager dashboard.', user: req.user });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});