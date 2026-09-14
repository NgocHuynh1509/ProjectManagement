import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import './TaskDetail.css';

const TaskDetail = () => {

    const { taskId } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [taskDescription, setTaskDescription] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [links, setLinks] = useState([]);
    const [newLink, setNewLink] = useState({ title: '', url: '' });
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const fetchTask = async () => {

        try {

            setError('');
            const response =
                await api.get(
                    `/employee/tasks/${taskId}`
                );

            setTask(response.data);
            setTaskDescription(response.data.description || '');
            setResultUrl(response.data.result_url || '');
            setLinks(response.data.task_links || []);

        } catch (error) {

            console.error(error);
            setError(
                error.response?.data?.error ||
                'Không thể tải công việc.'
            );

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        fetchTask();
    }, [taskId]);


    const updateTask = async (status = task.status) => {

        try {

            const response =
                await api.put(
                    `/employee/tasks/${taskId}/status`,
                    {
                        status,
                        description: taskDescription,
                        result_url: resultUrl
                    }
                );

            setTask(prev => ({
                ...prev,
                ...response.data.task
            }));

            setTaskDescription(response.data.task.description || '');
            setResultUrl(response.data.task.result_url || '');

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể cập nhật task.'
            );

        }
    };

    const addLink = async (event) => {
        event.preventDefault();
        if (!newLink.url.trim()) return;

        try {
            const response = await api.post(
                `/employee/tasks/${taskId}/links`,
                newLink
            );
            setLinks((previous) => [...previous, response.data]);
            setNewLink({ title: '', url: '' });
        } catch (requestError) {
            alert(requestError.response?.data?.error || 'Không thể thêm link.');
        }
    };

    const removeLink = async (linkId) => {
        try {
            await api.delete(`/employee/tasks/${taskId}/links/${linkId}`);
            setLinks((previous) => previous.filter((link) => link.id !== linkId));
        } catch (requestError) {
            alert(requestError.response?.data?.error || 'Không thể xóa link.');
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
                <p>{error || 'Không tìm thấy task.'}</p>
                <button onClick={fetchTask}>Thử lại</button>
            </div>
        );
    }


    return (
        <div className="tasks-page">

            <button
                className="back-button"
                onClick={() =>
                    navigate(
                        task.phases?.project_id
                            ? `/employee/projects/${task.phases.project_id}`
                            : '/employee/projects'
                    )
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

                    {task.is_assignee ? (
                        <select
                            value={task.status}
                            onChange={e =>
                                updateTask(e.target.value)
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
                    ) : (
                        <span className="task-status-select">
                            {task.status}
                        </span>
                    )}

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

                    <textarea
                        value={taskDescription}
                        onChange={e => setTaskDescription(e.target.value)}
                        placeholder="Mô tả tiến độ, kết quả thực hiện..."
                        rows="5"
                        readOnly={!task.is_assignee}
                    />

                    <div className="task-links-section">
                        <div className="task-section-heading">
                            <h3>Link đính kèm</h3>
                            <span>{links.length} link</span>
                        </div>
                        {task.is_assignee && (
                            <form className="task-link-form" onSubmit={addLink}>
                                <input
                                    value={newLink.title}
                                    onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                                    placeholder="Tên link (VD: Repository)"
                                />
                                <input
                                    type="url"
                                    value={newLink.url}
                                    onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                                    placeholder="https://..."
                                    required
                                />
                                <button type="submit">Thêm link</button>
                            </form>
                        )}
                        <div className="task-links-list">
                            {links.map(link => (
                                <div className="task-link-item" key={link.id}>
                                    <a href={link.url} target="_blank" rel="noreferrer">
                                        <strong>{link.title || 'Link kết quả'}</strong>
                                        <span>{link.url}</span>
                                    </a>
                                    {task.is_assignee && (
                                        <button type="button" onClick={() => removeLink(link.id)}>Xóa</button>
                                    )}
                                </div>
                            ))}
                            {!links.length && <p className="no-comments">Chưa có link đính kèm.</p>}
                        </div>
                    </div>

                    {task.is_assignee && (
                        <button
                            type="button"
                            className="task-update-button"
                            onClick={() => updateTask()}
                        >
                            Lưu cập nhật task
                        </button>
                    )}

                    {task.result_url && (
                        <a
                            className="task-result-link"
                            href={task.result_url}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Mở link kết quả
                        </a>
                    )}

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