import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import './MyTasks.css';

const TaskDetail = () => {

    const { taskId } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const fetchTask = async () => {

        try {

            const response =
                await api.get(
                    `/employee/tasks/${taskId}`
                );

            setTask(response.data);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        fetchTask();
    }, [taskId]);


    const updateStatus = async (status) => {

        try {

            const response =
                await api.put(
                    `/employee/tasks/${taskId}/status`,
                    { status }
                );

            setTask(prev => ({
                ...prev,
                status: response.data.task.status
            }));

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể cập nhật task.'
            );

        }
    };


    const submitComment = async (e) => {

        e.preventDefault();

        if (!comment.trim()) return;

        try {

            setSending(true);

            await api.post(
                `/employee/tasks/${taskId}/comments`,
                {
                    content: comment
                }
            );

            setComment('');

            await fetchTask();

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể gửi bình luận.'
            );

        } finally {

            setSending(false);

        }
    };


    if (loading) {
        return (
            <div className="tasks-loading">
                Đang tải task...
            </div>
        );
    }


    if (!task) {
        return (
            <div className="tasks-empty">
                Không tìm thấy task.
            </div>
        );
    }


    return (
        <div className="tasks-page">

            <button
                className="back-button"
                onClick={() =>
                    navigate('/employee/tasks')
                }
            >
                ← Quay lại
            </button>


            <div className="task-detail-card">

                <div className="task-detail-header">

                    <div>

                        <span
                            className={`task-priority ${task.priority}`}
                        >
                            {task.priority}
                        </span>

                        <h1>
                            {task.title}
                        </h1>

                    </div>

                    <select
                        value={task.status}
                        onChange={e =>
                            updateStatus(e.target.value)
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


                <div className="task-detail-info">

                    <div>
                        <span>Dự án</span>
                        <strong>
                            {task.phases?.projects?.name || '--'}
                        </strong>
                    </div>

                    <div>
                        <span>Giai đoạn</span>
                        <strong>
                            {task.phases?.name || '--'}
                        </strong>
                    </div>

                    <div>
                        <span>Deadline</span>
                        <strong>
                            {task.deadline
                                ? new Date(
                                    task.deadline
                                ).toLocaleString('vi-VN')
                                : '--'}
                        </strong>
                    </div>

                </div>


                <div className="task-description-full">

                    <h3>Mô tả</h3>

                    <p>
                        {task.description ||
                            'Không có mô tả.'}
                    </p>

                </div>


                <div className="task-comments">

                    <h3>Bình luận</h3>

                    <div className="comment-list">

                        {task.task_comments?.length ? (

                            task.task_comments.map(item => (

                                <div
                                    className="comment-item"
                                    key={item.id}
                                >

                                    <div className="comment-avatar">
                                        E
                                    </div>

                                    <div>

                                        <strong>
                                            Nhân viên
                                        </strong>

                                        <span>
                                            {new Date(
                                                item.created_at
                                            ).toLocaleString(
                                                'vi-VN'
                                            )}
                                        </span>

                                        <p>
                                            {item.content}
                                        </p>

                                    </div>

                                </div>

                            ))

                        ) : (

                            <p className="no-comments">
                                Chưa có bình luận.
                            </p>

                        )}

                    </div>


                    <form
                        className="comment-form"
                        onSubmit={submitComment}
                    >

                        <textarea
                            value={comment}
                            onChange={e =>
                                setComment(e.target.value)
                            }
                            placeholder="Viết bình luận..."
                            rows="3"
                        />

                        <button
                            type="submit"
                            disabled={sending}
                        >
                            {sending
                                ? 'Đang gửi...'
                                : 'Gửi bình luận'}
                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
};

export default TaskDetail;