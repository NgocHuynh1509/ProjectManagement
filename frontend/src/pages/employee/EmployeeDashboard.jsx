import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import api from '../../services/api';
import './EmployeeDashboard.css';

const EmployeeDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await api.get('/employee/dashboard');

                setDashboard(response.data);
            } catch (err) {
                console.error('Employee dashboard error:', err);

                setError(
                    err.response?.data?.error ||
                    'Không thể tải dữ liệu dashboard.'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    const getEmployeeName = () => {
        return (
            dashboard?.employee?.full_name ||
            dashboard?.employee?.name ||
            user?.user_metadata?.full_name ||
            user?.user_metadata?.name ||
            user?.email?.split('@')[0] ||
            'Nhân viên'
        );
    };

    const getInitial = () => {
        const name = getEmployeeName();

        return name
            .trim()
            .charAt(0)
            .toUpperCase();
    };

    const formatDate = (date) => {
        if (!date) return '--';

        return new Date(date).toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    };

    const formatShortDate = (date) => {
        if (!date) return '--';

        return new Date(date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
        });
    };

    const getTaskStatusText = (status) => {
        const statuses = {
            todo: 'Chưa làm',
            pending: 'Chờ xử lý',
            in_progress: 'Đang thực hiện',
            review: 'Đang review',
            completed: 'Hoàn thành',
            done: 'Hoàn thành',
            cancelled: 'Đã hủy',
        };

        return statuses[status] || status || 'Chưa xác định';
    };

    const getTaskStatusClass = (status) => {
        switch (status) {
            case 'completed':
            case 'done':
                return 'status-completed';

            case 'in_progress':
                return 'status-progress';

            case 'review':
                return 'status-review';

            case 'cancelled':
                return 'status-cancelled';

            default:
                return 'status-pending';
        }
    };

    const getPriorityText = (priority) => {
        const priorities = {
            low: 'Thấp',
            medium: 'Trung bình',
            high: 'Cao',
            urgent: 'Khẩn cấp',
        };

        return priorities[priority] || priority || 'Trung bình';
    };

    const getPriorityClass = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'priority-urgent';

            case 'high':
                return 'priority-high';

            case 'low':
                return 'priority-low';

            default:
                return 'priority-medium';
        }
    };

    const getAttendanceStatus = () => {
        const attendance = dashboard?.today_attendance;

        if (!attendance) {
            return {
                text: 'Chưa chấm công',
                className: 'attendance-not-checked',
            };
        }

        if (attendance.check_in && attendance.check_out) {
            return {
                text: 'Đã hoàn thành',
                className: 'attendance-completed',
            };
        }

        if (attendance.check_in) {
            return {
                text: 'Đang làm việc',
                className: 'attendance-working',
            };
        }

        return {
            text: 'Chưa chấm công',
            className: 'attendance-not-checked',
        };
    };

    if (loading) {
        return (
            <div className="employee-dashboard">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Đang tải dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="employee-dashboard">
                <div className="dashboard-error">
                    <div className="error-icon">!</div>

                    <h2>Không thể tải dashboard</h2>

                    <p>{error}</p>

                    <button
                        className="retry-button"
                        onClick={() => window.location.reload()}
                    >
                        Thử lại
                    </button>
                </div>
            </div>
        );
    }

    const attendanceStatus = getAttendanceStatus();

    const statistics = dashboard?.statistics || {};

    const tasks = dashboard?.upcoming_tasks || [];
    const projects = dashboard?.projects || [];
    const notifications = dashboard?.notifications || [];

    return (
        <div className="employee-dashboard">

            {/* =========================
                HEADER
            ========================= */}
            <section className="dashboard-header">

                <div className="welcome-section">

                    <div className="employee-avatar">
                        {getInitial()}
                    </div>

                    <div>
                        <p className="welcome-label">
                            Xin chào,
                        </p>

                        <h1>
                            {getEmployeeName()}
                        </h1>

                        <p className="current-date">
                            {formatDate(new Date())}
                        </p>
                    </div>

                </div>

                <button
                    className="profile-button"
                    onClick={() => navigate('/employee/profile')}
                >
                    Xem hồ sơ
                </button>

            </section>


            {/* =========================
                QUICK STATISTICS
            ========================= */}
            <section className="statistics-grid">

                <div
                    className="stat-card"
                    onClick={() => navigate('/employee/tasks')}
                >
                    <div className="stat-icon task-icon">
                        ✓
                    </div>

                    <div className="stat-content">
                        <span className="stat-label">
                            Công việc
                        </span>

                        <strong className="stat-value">
                            {statistics.total_tasks ?? 0}
                        </strong>

                        <span className="stat-description">
                            {statistics.pending_tasks ?? 0} công việc đang xử lý
                        </span>
                    </div>
                </div>


                <div
                    className="stat-card"
                    onClick={() => navigate('/employee/projects')}
                >
                    <div className="stat-icon project-icon">
                        P
                    </div>

                    <div className="stat-content">
                        <span className="stat-label">
                            Dự án
                        </span>

                        <strong className="stat-value">
                            {statistics.active_projects ?? 0}
                        </strong>

                        <span className="stat-description">
                            Dự án đang tham gia
                        </span>
                    </div>
                </div>


                <div
                    className="stat-card"
                    onClick={() => navigate('/employee/attendance')}
                >
                    <div className="stat-icon attendance-icon">
                        ⏱
                    </div>

                    <div className="stat-content">
                        <span className="stat-label">
                            Chấm công tháng này
                        </span>

                        <strong className="stat-value">
                            {statistics.attendance_days ?? 0}
                        </strong>

                        <span className="stat-description">
                            ngày đã chấm công
                        </span>
                    </div>
                </div>


                <div
                    className="stat-card"
                    onClick={() => navigate('/employee/leave')}
                >
                    <div className="stat-icon leave-icon">
                        L
                    </div>

                    <div className="stat-content">
                        <span className="stat-label">
                            Ngày nghỉ
                        </span>

                        <strong className="stat-value">
                            {statistics.leave_days ?? 0}
                        </strong>

                        <span className="stat-description">
                            ngày nghỉ còn lại
                        </span>
                    </div>
                </div>

            </section>


            {/* =========================
                MAIN GRID
            ========================= */}
            <section className="dashboard-main-grid">

                {/* =========================
                    LEFT COLUMN
                ========================= */}
                <div className="dashboard-left">

                    {/* TODAY ATTENDANCE */}
                    <div className="dashboard-card attendance-card">

                        <div className="card-header">

                            <div>
                                <h2>Chấm công hôm nay</h2>

                                <p>
                                    Theo dõi thời gian làm việc của bạn
                                </p>
                            </div>

                            <button
                                className="view-all-button"
                                onClick={() =>
                                    navigate('/employee/attendance')
                                }
                            >
                                Xem chi tiết
                            </button>

                        </div>


                        <div className="attendance-summary">

                            <div className="attendance-status">

                                <span
                                    className={`attendance-dot ${attendanceStatus.className}`}
                                ></span>

                                <span>
                                    {attendanceStatus.text}
                                </span>

                            </div>


                            <div className="attendance-times">

                                <div className="attendance-time">
                                    <span>
                                        Check-in
                                    </span>

                                    <strong>
                                        {dashboard?.today_attendance?.check_in
                                            ? new Date(
                                                dashboard.today_attendance.check_in
                                            ).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : '--:--'}
                                    </strong>
                                </div>


                                <div className="attendance-divider"></div>


                                <div className="attendance-time">
                                    <span>
                                        Check-out
                                    </span>

                                    <strong>
                                        {dashboard?.today_attendance?.check_out
                                            ? new Date(
                                                dashboard.today_attendance.check_out
                                            ).toLocaleTimeString('vi-VN', {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })
                                            : '--:--'}
                                    </strong>
                                </div>


                                <div className="attendance-divider"></div>


                                <div className="attendance-time">
                                    <span>
                                        Tổng giờ
                                    </span>

                                    <strong>
                                        {dashboard?.today_attendance?.work_hours
                                            ? `${dashboard.today_attendance.work_hours}h`
                                            : '--'}
                                    </strong>
                                </div>

                            </div>

                        </div>

                    </div>


                    {/* UPCOMING TASKS */}
                    <div className="dashboard-card">

                        <div className="card-header">

                            <div>
                                <h2>Công việc sắp tới</h2>

                                <p>
                                    Những công việc bạn cần hoàn thành
                                </p>
                            </div>

                            <button
                                className="view-all-button"
                                onClick={() =>
                                    navigate('/employee/tasks')
                                }
                            >
                                Xem tất cả
                            </button>

                        </div>


                        {tasks.length === 0 ? (

                            <div className="empty-state">
                                <div className="empty-icon">
                                    ✓
                                </div>

                                <p>
                                    Bạn không có công việc sắp tới.
                                </p>
                            </div>

                        ) : (

                            <div className="task-list">

                                {tasks.slice(0, 5).map((task) => (

                                    <div
                                        className="task-item"
                                        key={task.id}
                                        onClick={() =>
                                            navigate(
                                                `/employee/tasks/${task.id}`
                                            )
                                        }
                                    >

                                        <div className="task-info">

                                            <h3>
                                                {task.title}
                                            </h3>

                                            <p>
                                                {task.project_name ||
                                                    'Không thuộc dự án'}
                                            </p>

                                        </div>


                                        <div className="task-meta">

                                            <span
                                                className={`priority-badge ${getPriorityClass(
                                                    task.priority
                                                )}`}
                                            >
                                                {getPriorityText(
                                                    task.priority
                                                )}
                                            </span>

                                            <span
                                                className={`status-badge ${getTaskStatusClass(
                                                    task.status
                                                )}`}
                                            >
                                                {getTaskStatusText(
                                                    task.status
                                                )}
                                            </span>

                                            <span className="task-deadline">
                                                {formatShortDate(
                                                    task.due_date
                                                )}
                                            </span>

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>

                </div>


                {/* =========================
                    RIGHT COLUMN
                ========================= */}
                <div className="dashboard-right">

                    {/* PROJECTS */}
                    <div className="dashboard-card">

                        <div className="card-header">

                            <div>
                                <h2>Dự án của tôi</h2>

                                <p>
                                    Các dự án bạn đang tham gia
                                </p>
                            </div>

                            <button
                                className="view-all-button"
                                onClick={() =>
                                    navigate('/employee/projects')
                                }
                            >
                                Xem tất cả
                            </button>

                        </div>


                        {projects.length === 0 ? (

                            <div className="empty-state">
                                <div className="empty-icon">
                                    P
                                </div>

                                <p>
                                    Bạn chưa tham gia dự án nào.
                                </p>
                            </div>

                        ) : (

                            <div className="project-list">

                                {projects.slice(0, 4).map((project) => (

                                    <div
                                        className="project-item"
                                        key={project.id}
                                        onClick={() =>
                                            navigate(
                                                `/employee/projects/${project.id}`
                                            )
                                        }
                                    >

                                        <div className="project-top">

                                            <div className="project-name">
                                                {project.name}
                                            </div>

                                            <span className="project-percent">
                                                {project.progress ?? 0}%
                                            </span>

                                        </div>


                                        <div className="progress-bar">

                                            <div
                                                className="progress-value"
                                                style={{
                                                    width: `${Math.min(
                                                        Math.max(
                                                            project.progress ?? 0,
                                                            0
                                                        ),
                                                        100
                                                    )}%`,
                                                }}
                                            ></div>

                                        </div>


                                        <div className="project-bottom">

                                            <span>
                                                {project.completed_tasks ?? 0}
                                                /
                                                {project.total_tasks ?? 0}
                                                {' '}công việc
                                            </span>

                                            {project.deadline && (
                                                <span>
                                                    Deadline:{' '}
                                                    {formatShortDate(
                                                        project.deadline
                                                    )}
                                                </span>
                                            )}

                                        </div>

                                    </div>

                                ))}

                            </div>

                        )}

                    </div>


                    {/* NOTIFICATIONS */}
                    <div className="dashboard-card">

                        <div className="card-header">

                            <div>
                                <h2>Thông báo</h2>

                                <p>
                                    Cập nhật mới nhất
                                </p>
                            </div>

                            <button
                                className="view-all-button"
                                onClick={() =>
                                    navigate('/employee/notifications')
                                }
                            >
                                Xem tất cả
                            </button>

                        </div>


                        {notifications.length === 0 ? (

                            <div className="empty-state small">
                                <p>
                                    Không có thông báo mới.
                                </p>
                            </div>

                        ) : (

                            <div className="notification-list">

                                {notifications.slice(0, 4).map(
                                    (notification) => (

                                        <div
                                            className={`notification-item ${
                                                notification.is_read
                                                    ? ''
                                                    : 'unread'
                                            }`}
                                            key={notification.id}
                                        >

                                            <div className="notification-icon">
                                                !
                                            </div>

                                            <div className="notification-content">

                                                <h3>
                                                    {notification.title}
                                                </h3>

                                                <p>
                                                    {notification.message}
                                                </p>

                                                <span>
                                                    {notification.created_at
                                                        ? new Date(
                                                            notification.created_at
                                                        ).toLocaleString(
                                                            'vi-VN'
                                                        )
                                                        : ''}
                                                </span>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        )}

                    </div>

                </div>

            </section>


            {/* =========================
                QUICK ACTIONS
            ========================= */}
            <section className="quick-actions">

                <h2>Thao tác nhanh</h2>

                <div className="quick-action-grid">

                    <button
                        onClick={() =>
                            navigate('/employee/profile')
                        }
                    >
                        <span className="quick-icon">
                            👤
                        </span>

                        <span>
                            Hồ sơ cá nhân
                        </span>
                    </button>


                    <button
                        onClick={() =>
                            navigate('/employee/attendance')
                        }
                    >
                        <span className="quick-icon">
                            ⏱
                        </span>

                        <span>
                            Xem chấm công
                        </span>
                    </button>


                    <button
                        onClick={() =>
                            navigate('/employee/tasks')
                        }
                    >
                        <span className="quick-icon">
                            ✓
                        </span>

                        <span>
                            Công việc
                        </span>
                    </button>


                    <button
                        onClick={() =>
                            navigate('/employee/leave')
                        }
                    >
                        <span className="quick-icon">
                            L
                        </span>

                        <span>
                            Xin nghỉ phép
                        </span>
                    </button>

                </div>

            </section>

        </div>
    );
};

export default EmployeeDashboard;