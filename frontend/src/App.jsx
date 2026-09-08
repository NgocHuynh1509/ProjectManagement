import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import ManagerRoute from './components/layout/ManagerRoute';
import ManagerLayout from './components/layout/ManagerLayout';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import EmployeeList from './pages/manager/hr/EmployeeList';
import EmployeeDetail from './pages/manager/hr/EmployeeDetail';
import ProjectList from './pages/manager/projects/ProjectList';
import ProjectDetail from './pages/manager/projects/ProjectDetail';
import KanbanBoard from './pages/manager/projects/KanbanBoard';
import AttendanceOverview from './pages/manager/attendance/AttendanceOverview';

function Unauthorized() {
    return <main className="route-message"><h1>Không có quyền truy cập</h1><p>Tài khoản của bạn không có quyền vào khu vực quản trị.</p></main>;
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/" element={<Home />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route element={<ManagerRoute />}>
                        <Route path="/manager" element={<ManagerLayout />}>
                            <Route index element={<ManagerDashboard />} />
                            <Route path="dashboard" element={<ManagerDashboard />} />
                            <Route path="hr" element={<EmployeeList />} />
                            <Route path="hr/:employeeId" element={<EmployeeDetail />} />
                            <Route path="projects" element={<ProjectList />} />
                            <Route path="projects/:projectId" element={<ProjectDetail />} />
                            <Route path="projects/:projectId/kanban" element={<KanbanBoard />} />
                            <Route path="attendance" element={<AttendanceOverview />} />
                            <Route path="accounts" element={<div className="route-message"><h1>Quản lý tài khoản</h1><p>Danh sách tài khoản sẽ được kết nối với API.</p></div>} />
                            <Route path="settings" element={<div className="route-message"><h1>Cài đặt</h1><p>Cấu hình hệ thống dành cho manager.</p></div>} />
                        </Route>
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;