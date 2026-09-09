import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';

import Login from './pages/Login';
import Home from './pages/Home';

// ==================== MANAGER ====================
import ManagerRoute from './components/layout/ManagerRoute';
import ManagerLayout from './components/layout/ManagerLayout';
import ManagerDashboard from './pages/manager/ManagerDashboard';

import EmployeeList from './pages/manager/hr/EmployeeList';
import EmployeeDetail from './pages/manager/hr/EmployeeDetail';

import ProjectList from './pages/manager/projects/ProjectList';
import ProjectDetail from './pages/manager/projects/ProjectDetail';
import KanbanBoard from './pages/manager/projects/KanbanBoard';

import AttendanceOverview from './pages/manager/attendance/AttendanceOverview';

// ==================== EMPLOYEE ====================
import EmployeeRoute from './components/layout/EmployeeRoute';
import EmployeeLayout from './components/layout/EmployeeLayout';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeProfile from './pages/employee/profile/EmployeeProfile';
import MyAttendance from './pages/employee/attendance/MyAttendance';
import MyTasks from './pages/employee/tasks/MyTasks';
import TaskDetail from './pages/employee/tasks/TaskDetail';
import MyProjects from './pages/employee/projects/MyProjects';
import MyProjectDetail from './pages/employee/projects/MyProjectDetail';
import LeaveRequest from './pages/employee/leave/LeaveRequest';


// ==================== UNAUTHORIZED ====================

function Unauthorized() {
    return (
        <main className="route-message">
            <h1>Không có quyền truy cập</h1>
            <p>
                Tài khoản của bạn không có quyền vào khu vực này.
            </p>
        </main>
    );
}


// ==================== APP ====================

function App() {
    return (
        <AuthProvider>
            <Router>

                <Routes>

                    {/* ==================================================
                        PUBLIC
                    ================================================== */}

                    <Route
                        path="/login"
                        element={<Login />}
                    />

                    <Route
                        path="/"
                        element={<Home />}
                    />

                    <Route
                        path="/unauthorized"
                        element={<Unauthorized />}
                    />


                    {/* ==================================================
                        MANAGER
                    ================================================== */}

                    <Route element={<ManagerRoute />}>

                        <Route
                            path="/manager"
                            element={<ManagerLayout />}
                        >

                            {/* /manager */}
                            <Route
                                index
                                element={<ManagerDashboard />}
                            />

                            {/* /manager/dashboard */}
                            <Route
                                path="dashboard"
                                element={<ManagerDashboard />}
                            />

                            {/* /manager/hr */}
                            <Route
                                path="hr"
                                element={<EmployeeList />}
                            />

                            {/* /manager/hr/:employeeId */}
                            <Route
                                path="hr/:employeeId"
                                element={<EmployeeDetail />}
                            />

                            {/* /manager/projects */}
                            <Route
                                path="projects"
                                element={<ProjectList />}
                            />

                            {/* /manager/projects/:projectId */}
                            <Route
                                path="projects/:projectId"
                                element={<ProjectDetail />}
                            />

                            {/* /manager/projects/:projectId/kanban */}
                            <Route
                                path="projects/:projectId/kanban"
                                element={<KanbanBoard />}
                            />

                            {/* /manager/attendance */}
                            <Route
                                path="attendance"
                                element={<AttendanceOverview />}
                            />

                            {/* /manager/accounts */}
                            <Route
                                path="accounts"
                                element={
                                    <div className="route-message">
                                        <h1>Quản lý tài khoản</h1>
                                        <p>
                                            Danh sách tài khoản sẽ được
                                            kết nối với API.
                                        </p>
                                    </div>
                                }
                            />

                            {/* /manager/settings */}
                            <Route
                                path="settings"
                                element={
                                    <div className="route-message">
                                        <h1>Cài đặt</h1>
                                        <p>
                                            Cấu hình hệ thống dành cho manager.
                                        </p>
                                    </div>
                                }
                            />

                        </Route>

                    </Route>


                    {/* ==================================================
                        EMPLOYEE
                    ================================================== */}

                    <Route element={<EmployeeRoute />}>

                        <Route
                            path="/employee"
                            element={<EmployeeLayout />}
                        >

                            {/* /employee */}
                            <Route
                                index
                                element={<EmployeeDashboard />}
                            />

                            {/* /employee/profile */}
                            <Route
                                path="profile"
                                element={<EmployeeProfile />}
                            />

                            {/* /employee/attendance */}
                            <Route
                                path="attendance"
                                element={<MyAttendance />}
                            />

                            {/* /employee/tasks */}
                            <Route
                                path="tasks"
                                element={<MyTasks />}
                            />

                            {/* /employee/tasks/:taskId */}
                            <Route
                                path="tasks/:taskId"
                                element={<TaskDetail />}
                            />

                            {/* /employee/projects */}
                            <Route
                                path="projects"
                                element={<MyProjects />}
                            />

                            {/* /employee/projects/:projectId */}
                            <Route
                                path="projects/:projectId"
                                element={<MyProjectDetail />}
                            />

                            {/* /employee/leave */}
                            <Route
                                path="leave"
                                element={<LeaveRequest />}
                            />

                        </Route>

                    </Route>

                </Routes>

            </Router>
        </AuthProvider>
    );
}

export default App;