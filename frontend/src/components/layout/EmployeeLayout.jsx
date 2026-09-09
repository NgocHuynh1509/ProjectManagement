import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useContext, useState } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import './EmployeeLayout.css';

const EmployeeLayout = () => {

    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        {
            path: '/employee',
            label: 'Dashboard',
            icon: '🏠',
            end: true
        },
        {
            path: '/employee/profile',
            label: 'Hồ sơ của tôi',
            icon: '👤'
        },
        {
            path: '/employee/attendance',
            label: 'Chấm công',
            icon: '🕐'
        },
        {
            path: '/employee/tasks',
            label: 'Công việc',
            icon: '📋'
        },
        {
            path: '/employee/projects',
            label: 'Dự án',
            icon: '📁'
        },
        {
            path: '/employee/leave',
            label: 'Nghỉ phép',
            icon: '📝'
        }
    ];

    return (
        <div className="employee-layout">

            {/* MOBILE OVERLAY */}

            {sidebarOpen && (
                <div
                    className="employee-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}


            {/* SIDEBAR */}

            <aside
                className={`employee-sidebar ${
                    sidebarOpen ? 'open' : ''
                }`}
            >

                <div className="employee-sidebar-logo">

                    <div className="employee-logo-icon">
                        PM
                    </div>

                    <div>
                        <h2>ProjectHub</h2>
                        <span>Employee Portal</span>
                    </div>

                </div>


                {/* USER */}

                <div className="employee-user">

                    <div className="employee-user-avatar">

                        {user?.email?.charAt(0)?.toUpperCase() || 'E'}

                    </div>

                    <div className="employee-user-info">

                        <strong>
                            {user?.email || 'Employee'}
                        </strong>

                        <span>
                            Nhân viên
                        </span>

                    </div>

                </div>


                {/* MENU */}

                <nav className="employee-nav">

                    <p className="employee-menu-title">
                        MENU
                    </p>

                    {menuItems.map(item => (

                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.end}
                            className={({ isActive }) =>
                                `employee-nav-item ${
                                    isActive ? 'active' : ''
                                }`
                            }
                            onClick={() => setSidebarOpen(false)}
                        >

                            <span className="employee-nav-icon">
                                {item.icon}
                            </span>

                            <span>
                                {item.label}
                            </span>

                        </NavLink>

                    ))}

                </nav>


                {/* BOTTOM */}

                <div className="employee-sidebar-bottom">

                    <button
                        className="employee-logout"
                        onClick={handleLogout}
                    >
                        <span>🚪</span>
                        Đăng xuất
                    </button>

                </div>

            </aside>


            {/* MAIN */}

            <main className="employee-main">

                <header className="employee-topbar">

                    <button
                        className="employee-mobile-menu"
                        onClick={() =>
                            setSidebarOpen(!sidebarOpen)
                        }
                    >
                        ☰
                    </button>

                    <div className="employee-topbar-title">
                        <span>Employee Portal</span>
                    </div>

                    <div className="employee-topbar-right">

                        <button className="employee-notification">
                            🔔
                            <span />
                        </button>

                        <div className="employee-topbar-avatar">
                            {user?.email?.charAt(0)?.toUpperCase() || 'E'}
                        </div>

                    </div>

                </header>


                <div className="employee-page-content">
                    <Outlet />
                </div>

            </main>

        </div>
    );
};

export default EmployeeLayout;