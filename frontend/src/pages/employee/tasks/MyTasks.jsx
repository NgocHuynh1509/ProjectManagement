import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './MyTasks.css';

const MyTasks = () => {

    const navigate = useNavigate();

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    const fetchTasks = async () => {

        try {

            setLoading(true);

            const response =
                await api.get('/employee/tasks');

            setTasks(response.data || []);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }
    };

    useEffect(() => {
        fetchTasks();
    }, []);


    const filteredTasks =
        filter === 'all'
            ? tasks
            : tasks.filter(
                task => task.status === filter
            );


    const handleStatusChange = async (
        taskId,
        status
    ) => {

        try {

            await api.put(
                `/employee/tasks/${taskId}/status`,
                { status }
            );

            setTasks(prev =>
                prev.map(task =>
                    task.id === taskId
                        ? { ...task, status }
                        : task
                )
            );

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể cập nhật trạng thái.'
            );

        }
    };


    return (
        <div className="tasks-page">

            <div className="employee-page-heading">

                <div>
                    <h1>Công việc của tôi</h1>
                    <p>
                        Các công việc được giao cho bạn
                    </p>
                </div>

            </div>


            {/* FILTER */}

            <div className="task-filters">

                {[
                    ['all', 'Tất cả'],
                    ['todo', 'Chưa làm'],
                    ['in_progress', 'Đang làm'],
                    ['review', 'Review'],
                    ['done', 'Hoàn thành']
                ].map(([value, label]) => (

                    <button
                        key={value}
                        className={
                            filter === value
                                ? 'active'
                                : ''
                        }
                        onClick={() =>
                            setFilter(value)
                        }
                    >
                        {label}
                    </button>

                ))}

            </div>


            {/* TASK LIST */}

            {loading ? (

                <div className="tasks-loading">
                    Đang tải công việc...
                </div>

            ) : (

                <div className="tasks-list">

                    {filteredTasks.length ? (

                        filteredTasks.map(task => (

                            <div
                                className="task-card"
                                key={task.id}
                                onClick={() =>
                                    navigate(
                                        `/employee/tasks/${task.id}`
                                    )
                                }
                            >

                                <div className="task-card-main">

                                    <div className="task-title-row">

                                        <h3>
                                            {task.title}
                                        </h3>

                                        <span
                                            className={`task-priority ${task.priority}`}
                                        >
                                            {task.priority}
                                        </span>

                                    </div>

                                    <p className="task-description">
                                        {task.description ||
                                            'Không có mô tả'}
                                    </p>

                                    <div className="task-meta">

                                        <span>
                                            📁{' '}
                                            {task.phases?.projects?.name ||
                                                'Dự án'}
                                        </span>

                                        <span>
                                            🗓️{' '}
                                            {task.deadline
                                                ? new Date(
                                                    task.deadline
                                                ).toLocaleDateString(
                                                    'vi-VN'
                                                )
                                                : 'Không có deadline'}
                                        </span>

                                    </div>

                                </div>


                                <select
                                    value={task.status}
                                    onClick={e =>
                                        e.stopPropagation()
                                    }
                                    onChange={e =>
                                        handleStatusChange(
                                            task.id,
                                            e.target.value
                                        )
                                    }
                                    className="task-status-select"
                                >

                                    <option value="todo">
                                        Chưa làm
                                    </option>

                                    <option value="in_progress">
                                        Đang làm
                                    </option>

                                    <option value="review">
                                        Review
                                    </option>

                                    <option value="done">
                                        Hoàn thành
                                    </option>

                                </select>

                            </div>

                        ))

                    ) : (

                        <div className="tasks-empty">
                            Không có công việc nào.
                        </div>

                    )}

                </div>

            )}

        </div>
    );
};

export default MyTasks;