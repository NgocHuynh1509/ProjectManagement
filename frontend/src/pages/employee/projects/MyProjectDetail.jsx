import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import './MyProjectDetail.css';

const MyProjectDetail = () => {

    const { projectId } = useParams();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expandedPhases, setExpandedPhases] = useState(new Set());
    const [taskFilter, setTaskFilter] = useState('all');
    const [expandedPhaseTaskId, setExpandedPhaseTaskId] = useState(null);
    const [expandedMyTaskId, setExpandedMyTaskId] = useState(null);
    const [expandedTask, setExpandedTask] = useState(null);
    const [taskDetailLoading, setTaskDetailLoading] = useState(false);
    const [taskComment, setTaskComment] = useState('');
    const [taskCommentSending, setTaskCommentSending] = useState(false);
    const [newLink, setNewLink] = useState({ title: '', url: '' });

    const togglePhase = (phaseId) => {
        setExpandedPhases(previous => {
            const next = new Set(previous);

            if (next.has(phaseId)) {
                next.delete(phaseId);
            } else {
                next.add(phaseId);
            }

            return next;
        });
    };

    const getStatusLabel = (status) => ({
        todo: 'Chưa làm',
        in_progress: 'Đang làm',
        review: 'Review',
        done: 'Hoàn thành'
    }[status] || status || '--');

    const toggleTask = async (task, group) => {
        const isPhaseTask = group === 'phase';
        const expandedTaskId = isPhaseTask
            ? expandedPhaseTaskId
            : expandedMyTaskId;
        const setExpandedTaskId = isPhaseTask
            ? setExpandedPhaseTaskId
            : setExpandedMyTaskId;

        if (expandedTaskId === task.id) {
            setExpandedTaskId(null);
            setExpandedTask(null);
            return;
        }

        setExpandedPhaseTaskId(isPhaseTask ? task.id : null);
        setExpandedMyTaskId(isPhaseTask ? null : task.id);
        setExpandedTaskId(task.id);
        setExpandedTask(null);
        setTaskDetailLoading(true);

        try {
            const response = await api.get(`/employee/tasks/${task.id}`);
            setExpandedTask(response.data);
        } catch (requestError) {
            alert(
                requestError.response?.data?.error ||
                'Không thể tải chi tiết công việc.'
            );
            setExpandedPhaseTaskId(null);
            setExpandedMyTaskId(null);
        } finally {
            setTaskDetailLoading(false);
        }
    };

    const addTaskLink = async (event) => {
        event.preventDefault();
        if (!newLink.url.trim() || !expandedTask) return;

        try {
            const response = await api.post(
                `/employee/tasks/${expandedTask.id}/links`,
                newLink
            );
            setExpandedTask(previous => ({
                ...previous,
                task_links: [...(previous.task_links || []), response.data]
            }));
            setNewLink({ title: '', url: '' });
        } catch (requestError) {
            alert(requestError.response?.data?.error || 'Không thể thêm link.');
        }
    };

    const removeTaskLink = async (linkId) => {
        if (!expandedTask) return;

        try {
            await api.delete(
                `/employee/tasks/${expandedTask.id}/links/${linkId}`
            );
            setExpandedTask(previous => ({
                ...previous,
                task_links: (previous.task_links || []).filter(link => link.id !== linkId)
            }));
        } catch (requestError) {
            alert(requestError.response?.data?.error || 'Không thể xóa link.');
        }
    };

    const submitTaskComment = async (event) => {
        event.preventDefault();
        if (!taskComment.trim() || !expandedTask) return;

        try {
            setTaskCommentSending(true);
            const response = await api.post(
                `/employee/tasks/${expandedTask.id}/comments`,
                { content: taskComment }
            );
            setExpandedTask(previous => ({
                ...previous,
                task_comments: [...(previous.task_comments || []), response.data]
            }));
            setTaskComment('');
        } catch (requestError) {
            alert(requestError.response?.data?.error || 'Không thể gửi bình luận.');
        } finally {
            setTaskCommentSending(false);
        }
    };

    const updateTaskStatus = async (status) => {
        if (!expandedTask?.is_assignee || expandedTask.status === status) return;

        try {
            const response = await api.put(
                `/employee/tasks/${expandedTask.id}/status`,
                { status }
            );
            const updatedTask = response.data.task;

            setExpandedTask(previous => ({
                ...previous,
                ...updatedTask
            }));
            setData(previous => ({
                ...previous,
                myTasks: (previous.myTasks || []).map(task =>
                    task.id === updatedTask.id
                        ? { ...task, status: updatedTask.status }
                        : task
                ),
                phases: (previous.phases || []).map(phase => ({
                    ...phase,
                    tasks: (phase.tasks || []).map(task =>
                        task.id === updatedTask.id
                            ? { ...task, status: updatedTask.status }
                            : task
                    )
                }))
            }));
        } catch (requestError) {
            alert(
                requestError.response?.data?.error ||
                'Không thể cập nhật trạng thái task.'
            );
        }
    };

    const renderTaskDetail = () => {
        if (taskDetailLoading) {
            return <p className="task-detail-loading">Đang tải chi tiết công việc...</p>;
        }

        if (!expandedTask) return null;

        return (
            <div className="inline-task-detail task-detail-actions">
                <h3>{expandedTask.title}</h3>
                <p>{expandedTask.description || 'Không có mô tả.'}</p>
                <div className="inline-task-meta">
                    <span>Người phụ trách: {expandedTask.assignee?.full_name || 'Chưa phân công'}</span>
                    <span>Trạng thái: {getStatusLabel(expandedTask.status)}</span>
                    <span>Ưu tiên: {expandedTask.priority || '--'}</span>
                    <span>Deadline: {expandedTask.deadline
                        ? new Date(expandedTask.deadline).toLocaleDateString('vi-VN')
                        : '--'}</span>
                </div>

                {expandedTask.is_assignee && (
                    <div className="inline-task-status-actions">
                        <span>Cập nhật trạng thái:</span>
                        {[
                            ['in_progress', 'Đang làm'],
                            ['review', 'Review']
                        ].map(([status, label]) => (
                            <button
                                type="button"
                                key={status}
                                className={expandedTask.status === status ? 'active' : ''}
                                onClick={() => updateTaskStatus(status)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                )}

                <div className="inline-task-links">
                    <h4>Link đính kèm ({expandedTask.task_links?.length || 0})</h4>
                    {expandedTask.is_assignee && (
                        <form className="inline-link-form" onSubmit={addTaskLink}>
                            <input
                                value={newLink.title}
                                onChange={event => setNewLink({ ...newLink, title: event.target.value })}
                                placeholder="Tên link"
                            />
                            <input
                                type="url"
                                value={newLink.url}
                                onChange={event => setNewLink({ ...newLink, url: event.target.value })}
                                placeholder="https://..."
                                required
                            />
                            <button type="submit">Thêm link</button>
                        </form>
                    )}
                    {(expandedTask.task_links || []).map(link => (
                        <div className="inline-link-item" key={link.id}>
                            <a href={link.url} target="_blank" rel="noreferrer">
                                {link.title || 'Link kết quả'}
                            </a>
                            {expandedTask.is_assignee && (
                                <button type="button" onClick={() => removeTaskLink(link.id)}>
                                    Xóa
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <div className="inline-task-comments">
                    <h4>Bình luận ({expandedTask.task_comments?.length || 0})</h4>
                    {(expandedTask.task_comments || []).map(comment => (
                        <div className="inline-comment" key={comment.id}>
                            <strong>{comment.employees?.full_name || 'Nhân viên'}</strong>
                            <p>{comment.content}</p>
                        </div>
                    ))}
                    <form onSubmit={submitTaskComment}>
                        <textarea
                            value={taskComment}
                            onChange={event => setTaskComment(event.target.value)}
                            placeholder="Viết bình luận..."
                            rows="3"
                        />
                        <button type="submit" disabled={taskCommentSending}>
                            {taskCommentSending ? 'Đang gửi...' : 'Gửi bình luận'}
                        </button>
                    </form>
                </div>
            </div>
        );
    };

    useEffect(() => {

        const fetchProject = async () => {

            try {

                setError('');
                const response =
                    await api.get(
                        `/employee/projects/${projectId}`
                    );

                setData(response.data);

            } catch (error) {

                console.error(error);
                setError(
                    error.response?.data?.error ||
                    'Không thể tải chi tiết dự án.'
                );

            } finally {

                setLoading(false);

            }
        };

        fetchProject();

    }, [projectId]);


    if (loading) {
        return (
            <div className="projects-empty">
                Đang tải dự án...
            </div>
        );
    }


    if (!data) {
        return (
            <div className="projects-empty">
                <p>{error || 'Không thể tải dự án.'}</p>
                <button onClick={() => window.location.reload()}>
                    Thử lại
                </button>
            </div>
        );
    }


    const project = data.project;
    const filteredMyTasks = (data.myTasks || []).filter(task =>
        taskFilter === 'all' || task.status === taskFilter
    );


    return (
        <div className="projects-page">

            <button
                className="back-button"
                onClick={() =>
                    navigate('/employee/projects')
                }
            >
                ← Quay lại
            </button>


            <div className="project-detail-card">

                <div className="project-detail-header">

                    <div>

                        <span className="project-detail-icon">
                            📁
                        </span>

                        <h1>
                            {project.name}
                        </h1>

                        <p>
                            {project.description ||
                                'Không có mô tả'}
                        </p>

                    </div>

                    <span className="project-status">
                        {project.status}
                    </span>

                </div>


                <div className="project-detail-meta">

                    <div>
                        <span>Vai trò</span>
                        <strong>
                            {data.role_in_project ||
                                'Thành viên'}
                        </strong>
                    </div>

                    <div>
                        <span>Ngày bắt đầu</span>
                        <strong>
                            {project.start_date || '--'}
                        </strong>
                    </div>

                    <div>
                        <span>Ngày kết thúc</span>
                        <strong>
                            {project.end_date || '--'}
                        </strong>
                    </div>

                </div>


                <section className="project-phases">

                    <h2>Các giai đoạn</h2>

                    {data.phases?.length ? (

                        data.phases.map(phase => (

                            <div
                                className={`phase-group ${
                                    expandedPhases.has(phase.id)
                                        ? 'expanded'
                                        : ''
                                }`}
                                key={phase.id}
                            >

                                <button
                                    type="button"
                                    className="phase-item phase-toggle"
                                    onClick={() => togglePhase(phase.id)}
                                >

                                    <div>

                                        <strong>
                                            {phase.name}
                                        </strong>

                                        <p>
                                            {phase.description ||
                                                'Không có mô tả'}
                                        </p>

                                    </div>

                                    <span className="phase-summary">
                                        <span>
                                            {phase.tasks?.length || 0} task
                                        </span>
                                        <span>
                                            {phase.status}
                                        </span>
                                        <span className="phase-chevron">
                                            {expandedPhases.has(phase.id)
                                                ? '▾'
                                                : '▸'}
                                        </span>
                                    </span>

                                </button>

                                {expandedPhases.has(phase.id) && (
                                    <div className="phase-task-list">

                                        {phase.tasks?.length ? (
                                            phase.tasks.map(task => (
                                                <div className="phase-task-group" key={task.id}>
                                                    <button
                                                        type="button"
                                                        className="phase-task-item"
                                                        onClick={() => toggleTask(task, 'phase')}
                                                    >
                                                        <span>
                                                            <strong>{task.title}</strong>
                                                            <small>
                                                                {task.assignee?.full_name ||
                                                                    'Chưa phân công'}
                                                            </small>
                                                        </span>
                                                        <span className="task-status-badge">
                                                            {getStatusLabel(task.status)}
                                                            <span className="task-chevron">
                                                                {expandedPhaseTaskId === task.id ? '▾' : '▸'}
                                                            </span>
                                                        </span>
                                                    </button>

                                                    {expandedPhaseTaskId === task.id && renderTaskDetail()}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="no-data">
                                                Chưa có công việc trong giai đoạn này.
                                            </p>
                                        )}

                                    </div>
                                )}

                            </div>

                        ))

                    ) : (

                        <p className="no-data">
                            Chưa có giai đoạn.
                        </p>

                    )}

                </section>


                <section className="project-phases">

                    <div className="section-heading-row">
                        <h2>Công việc của tôi trong dự án</h2>
                        <div className="task-filters">
                            {[
                                ['all', 'Tất cả'],
                                ['todo', 'Chưa làm'],
                                ['in_progress', 'Đang làm'],
                                ['review', 'Review'],
                                ['done', 'Hoàn thành']
                            ].map(([value, label]) => (
                                <button
                                    type="button"
                                    key={value}
                                    className={taskFilter === value ? 'active' : ''}
                                    onClick={() => setTaskFilter(value)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredMyTasks.length ? (
                        filteredMyTasks.map(task => (
                            <div className="my-task-group" key={task.id}>
                                <button
                                    type="button"
                                    className="phase-item my-task-item"
                                    onClick={() => toggleTask(task, 'mine')}
                                >
                                    <div>
                                        <strong>{task.title}</strong>
                                        <p>
                                            Deadline:{' '}
                                            {task.deadline
                                                ? new Date(task.deadline).toLocaleDateString('vi-VN')
                                                : '--'}
                                        </p>
                                    </div>
                                    <span>
                                        {getStatusLabel(task.status)}
                                        <span className="task-chevron">
                                            {expandedMyTaskId === task.id ? '▾' : '▸'}
                                        </span>
                                    </span>
                                </button>

                                {expandedMyTaskId === task.id && renderTaskDetail()}
                            </div>
                        ))
                    ) : (
                        <p className="no-data">
                            {data.myTasks?.length
                                ? 'Không có công việc theo trạng thái này.'
                                : 'Bạn chưa được giao task nào trong dự án.'}
                        </p>
                    )}

                </section>

            </div>

        </div>
    );
};

export default MyProjectDetail;