
// ============================================================
// frontend/src/pages/manager/projects/KanbanBoard.jsx
// ============================================================

import { useEffect, useState } from 'react';
import {
  Plus,
  Clock,
  MessageSquare,
  Edit,
  Trash2,
  X,
  Save,
  Link2
} from 'lucide-react';

import api from '../../../services/api';
import './Projects.css';

const COLUMNS = [
  {
    id: 'todo',
    label: 'Cần làm',
    description: 'Task chưa bắt đầu'
  },
  {
    id: 'in_progress',
    label: 'Đang làm',
    description: 'Task đang thực hiện'
  },
  {
    id: 'review',
    label: 'Chờ duyệt',
    description: 'Task đang chờ review'
  },
  {
    id: 'done',
    label: 'Hoàn thành',
    description: 'Task đã hoàn thành'
  }
];

const PRIORITIES = [
  {
    value: 'low',
    label: 'Thấp'
  },
  {
    value: 'medium',
    label: 'Trung bình'
  },
  {
    value: 'high',
    label: 'Cao'
  },
  {
    value: 'urgent',
    label: 'Khẩn cấp'
  }
];

const EMPTY_TASK = {
  title: '',
  description: '',
  phase_id: '',
  assignee_id: '',
  priority: 'medium',
  status: 'todo',
  deadline: ''
};

export default function KanbanBoard({
  projectId,
  phases = [],
  employees = [],
  managerId,
  selectedPhaseId = 'all',
  onSelectPhase
}) {
  const [tasks, setTasks] = useState({
    todo: [],
    in_progress: [],
    review: [],
    done: []
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [draggedTask, setDraggedTask] =
    useState(null);

  const [showTaskForm, setShowTaskForm] =
    useState(false);

  const [editingTask, setEditingTask] =
    useState(null);

  const [taskForm, setTaskForm] =
    useState(EMPTY_TASK);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetailLoading, setTaskDetailLoading] = useState(false);
  const [taskComment, setTaskComment] = useState('');
  const [taskCommentSending, setTaskCommentSending] = useState(false);
  const [expandedMyTaskId, setExpandedMyTaskId] = useState(null);
  const [myTaskDetail, setMyTaskDetail] = useState(null);
  const [myTaskDetailLoading, setMyTaskDetailLoading] = useState(false);
  const [myTaskComment, setMyTaskComment] = useState('');
  const [myTaskCommentSending, setMyTaskCommentSending] = useState(false);
  const [myTaskLink, setMyTaskLink] = useState({ title: '', url: '' });

  const visibleTasks = Object.fromEntries(
    Object.entries(tasks).map(([status, statusTasks]) => [
      status,
      selectedPhaseId === 'all'
        ? statusTasks
        : statusTasks.filter(
          (task) => task.phase_id === selectedPhaseId
        )
    ])
  );

  const myTasks = Object.values(tasks)
    .flat()
    .filter((task) => task.assigneeId === managerId);

  const selectedPhase = phases.find(
    (phase) => phase.id === selectedPhaseId
  );

  const groupTasks = (taskList) => {
    const grouped = {
      todo: [],
      in_progress: [],
      review: [],
      done: []
    };

    taskList.forEach((task) => {
      const status = grouped[task.status]
        ? task.status
        : 'todo';

      grouped[status].push(task);
    });

    return grouped;
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get(
        `/projects/${projectId}/tasks`
      );

      setTasks(groupTasks(data || []));
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể tải danh sách công việc.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId]);

  const openCreateTask = (status = 'todo') => {
    setEditingTask(null);

    setTaskForm({
      ...EMPTY_TASK,
      phase_id: phases[0]?.id || '',
      status
    });

    setFormError('');
    setShowTaskForm(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);

    setTaskForm({
      title: task.title || '',
      description: task.description || '',
      phase_id: task.phase_id || '',
      assignee_id: task.assigneeId || '',
      priority: task.priority || 'medium',
      status: task.status || 'todo',
      deadline: task.deadline || ''
    });

    setFormError('');
    setShowTaskForm(true);
  };

  const handleTaskChange = (event) => {
    const { name, value } = event.target;

    setTaskForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleTaskSubmit = async (event) => {
    event.preventDefault();

    if (!taskForm.title.trim()) {
      setFormError('Tên công việc là bắt buộc.');
      return;
    }

    if (!taskForm.phase_id) {
      setFormError('Vui lòng chọn giai đoạn.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const payload = {
        ...taskForm,
        assignee_id:
          taskForm.assignee_id || null,
        deadline:
          taskForm.deadline || null
      };

      if (editingTask) {
        await api.put(
          `/projects/tasks/${editingTask.id}`,
          payload
        );
      } else {
        await api.post(
          `/projects/${projectId}/tasks`,
          payload
        );
      }

      setShowTaskForm(false);
      setEditingTask(null);

      await loadTasks();
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.error ||
        'Không thể lưu công việc.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (task) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa task "${task.title}"?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/projects/tasks/${task.id}`
      );

      await loadTasks();
    } catch (requestError) {
      window.alert(
        requestError.response?.data?.error ||
        'Không thể xóa công việc.'
      );
    }
  };

  const openTaskDetail = async (task) => {
    try {
      setTaskDetailLoading(true);
      const { data } = await api.get(`/projects/tasks/${task.id}/detail`);
      setSelectedTask(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể tải chi tiết task.');
    } finally {
      setTaskDetailLoading(false);
    }
  };

  const submitTaskComment = async (event) => {
    event.preventDefault();
    if (!selectedTask || !taskComment.trim()) return;

    try {
      setTaskCommentSending(true);
      const { data } = await api.post(
        `/projects/tasks/${selectedTask.id}/comments`,
        { content: taskComment }
      );
      setSelectedTask((previous) => ({
        ...previous,
        task_comments: [
          ...(previous.task_comments || []),
          data
        ]
      }));
      setTaskComment('');
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể gửi bình luận.'
      );
    } finally {
      setTaskCommentSending(false);
    }
  };

  const toggleMyTask = async (task) => {
    if (expandedMyTaskId === task.id) {
      setExpandedMyTaskId(null);
      setMyTaskDetail(null);
      return;
    }

    try {
      setExpandedMyTaskId(task.id);
      setMyTaskDetailLoading(true);
      const { data } = await api.get(`/projects/tasks/${task.id}/detail`);
      setMyTaskDetail(data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể tải chi tiết task.');
      setExpandedMyTaskId(null);
    } finally {
      setMyTaskDetailLoading(false);
    }
  };

  const updateMyTaskStatus = async (status) => {
    if (!myTaskDetail || myTaskDetail.status === status) return;

    try {
      const { data } = await api.put(
        `/projects/tasks/${myTaskDetail.id}/status`,
        { status }
      );
      setMyTaskDetail((previous) => ({ ...previous, ...data }));
      await loadTasks();
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể cập nhật trạng thái.');
    }
  };

  const addMyTaskLink = async (event) => {
    event.preventDefault();
    if (!myTaskDetail || !myTaskLink.url.trim()) return;

    try {
      const { data } = await api.post(
        `/projects/tasks/${myTaskDetail.id}/links`,
        myTaskLink
      );
      setMyTaskDetail((previous) => ({
        ...previous,
        task_links: [...(previous.task_links || []), data]
      }));
      setMyTaskLink({ title: '', url: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể thêm link.');
    }
  };

  const removeMyTaskLink = async (linkId) => {
    if (!myTaskDetail) return;

    try {
      await api.delete(`/projects/tasks/${myTaskDetail.id}/links/${linkId}`);
      setMyTaskDetail((previous) => ({
        ...previous,
        task_links: (previous.task_links || []).filter((link) => link.id !== linkId)
      }));
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể xóa link.');
    }
  };

  const submitMyTaskComment = async (event) => {
    event.preventDefault();
    if (!myTaskDetail || !myTaskComment.trim()) return;

    try {
      setMyTaskCommentSending(true);
      const { data } = await api.post(
        `/projects/tasks/${myTaskDetail.id}/comments`,
        { content: myTaskComment }
      );
      setMyTaskDetail((previous) => ({
        ...previous,
        task_comments: [...(previous.task_comments || []), data]
      }));
      setMyTaskComment('');
    } catch (requestError) {
      setError(requestError.response?.data?.error || 'Không thể gửi bình luận.');
    } finally {
      setMyTaskCommentSending(false);
    }
  };

  const renderMyTaskDetail = () => {
    if (myTaskDetailLoading) {
      return <div className="manager-inline-task-detail">Đang tải chi tiết...</div>;
    }

    if (!myTaskDetail) return null;

    return (
      <div className="manager-inline-task-detail">
        <p>{myTaskDetail.description || 'Chưa có mô tả.'}</p>
        <div className="manager-task-status-actions">
          <span>Cập nhật trạng thái:</span>
          {COLUMNS.filter((column) => column.id !== 'todo').map((column) => (
            <button
              type="button"
              key={column.id}
              className={myTaskDetail.status === column.id ? 'active' : ''}
              onClick={() => updateMyTaskStatus(column.id)}
            >
              {column.label}
            </button>
          ))}
        </div>
        <div className="manager-task-links">
          <h4>Link đính kèm ({myTaskDetail.task_links?.length || 0})</h4>
          <form onSubmit={addMyTaskLink}>
            <input
              value={myTaskLink.title}
              onChange={(event) => setMyTaskLink({ ...myTaskLink, title: event.target.value })}
              placeholder="Tên link"
            />
            <input
              type="url"
              value={myTaskLink.url}
              onChange={(event) => setMyTaskLink({ ...myTaskLink, url: event.target.value })}
              placeholder="https://..."
              required
            />
            <button type="submit">Nộp link</button>
          </form>
          {(myTaskDetail.task_links || []).map((link) => (
            <div className="manager-task-link" key={link.id}>
              <a href={link.url} target="_blank" rel="noreferrer">{link.title || link.url}</a>
              <button type="button" onClick={() => removeMyTaskLink(link.id)}>Xóa</button>
            </div>
          ))}
        </div>
        <div className="manager-task-comments">
          <h4>Bình luận ({myTaskDetail.task_comments?.length || 0})</h4>
          {(myTaskDetail.task_comments || []).map((comment) => (
            <div key={comment.id}>
              <strong>{comment.employees?.full_name || 'Nhân viên'}</strong>
              <p>{comment.content}</p>
            </div>
          ))}
          <form onSubmit={submitMyTaskComment}>
            <textarea
              value={myTaskComment}
              onChange={(event) => setMyTaskComment(event.target.value)}
              placeholder="Viết bình luận..."
              rows="3"
            />
            <button type="submit" disabled={myTaskCommentSending}>
              {myTaskCommentSending ? 'Đang gửi...' : 'Gửi bình luận'}
            </button>
          </form>
        </div>
      </div>
    );
  };

  const handleDragStart = (
    event,
    task,
    sourceColumn
  ) => {
    setDraggedTask({
      task,
      sourceColumn
    });

    event.dataTransfer.effectAllowed = 'move';

    event.currentTarget.classList.add(
      'dragging'
    );
  };

  const handleDragEnd = (event) => {
    event.currentTarget.classList.remove(
      'dragging'
    );

    setDraggedTask(null);
  };

  const handleDragOver = (event) => {
    event.preventDefault();

    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (
    event,
    targetColumn
  ) => {
    event.preventDefault();

    if (!draggedTask) return;

    const {
      task,
      sourceColumn
    } = draggedTask;

    if (sourceColumn === targetColumn) {
      setDraggedTask(null);
      return;
    }

    // Lưu state cũ để rollback
    const previousTasks = tasks;

    // Optimistic update
    setTasks((previous) => {
      const source = [
        ...previous[sourceColumn]
      ];

      const target = [
        ...previous[targetColumn]
      ];

      const taskIndex = source.findIndex(
        (item) => item.id === task.id
      );

      if (taskIndex === -1) {
        return previous;
      }

      const [movedTask] =
        source.splice(taskIndex, 1);

      target.push({
        ...movedTask,
        status: targetColumn
      });

      return {
        ...previous,
        [sourceColumn]: source,
        [targetColumn]: target
      };
    });

    setDraggedTask(null);

    try {
      await api.put(
        `/projects/tasks/${task.id}/status`,
        {
          status: targetColumn
        }
      );
    } catch (requestError) {
      setTasks(previousTasks);

      setError(
        requestError.response?.data?.error ||
        'Không thể lưu trạng thái task.'
      );

      setTimeout(() => {
        setError('');
      }, 4000);
    }
  };

  if (loading) {
    return (
      <div className="kanban-loading">
        Đang tải công việc...
      </div>
    );
  }

  return (
    <div className="kanban-wrapper">

      {error && (
        <div className="kanban-error">
          {error}
        </div>
      )}

      <div className="kanban-toolbar">

        <div>
          <h2>Bảng Công Việc</h2>
          <p>
            {selectedPhase
              ? `Đang xem task của phase: ${selectedPhase.name}`
              : 'Xem và cập nhật task theo từng phase.'}
          </p>
        </div>

        <select
          className="phase-filter-select"
          value={selectedPhaseId}
          onChange={(event) => onSelectPhase?.(event.target.value)}
          aria-label="Chọn phase để xem task"
        >
          <option value="all">Tất cả phase</option>
          {phases.map((phase) => (
            <option key={phase.id} value={phase.id}>
              {phase.name}
            </option>
          ))}
        </select>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => openCreateTask()}
          disabled={phases.length === 0}
        >
          <Plus size={16} />
          Thêm Task
        </button>

      </div>

      {phases.length === 0 && (
        <div className="kanban-empty-warning">
          <strong>Chưa có giai đoạn.</strong>
          <span>
            Hãy tạo ít nhất một giai đoạn trước
            khi thêm task.
          </span>
        </div>
      )}

      <div className="kanban-container">

        {COLUMNS.map((column) => (
          <div
            key={column.id}
            className={`kanban-column ${column.id}`}
            onDragOver={handleDragOver}
            onDrop={(event) =>
              handleDrop(event, column.id)
            }
          >

            <div className="column-header">

              <div>
                <div className="column-title">
                  {column.label}
                </div>

                <div className="column-description">
                  {column.description}
                </div>
              </div>

              <span className="task-count">
                {visibleTasks[column.id].length}
              </span>

            </div>

            <div className="kanban-tasks">

              {visibleTasks[column.id].map((task) => (
                <div
                  key={task.id}
                  className="task-card glass-panel"
                  onClick={() => openTaskDetail(task)}
                  draggable
                  onDragStart={(event) =>
                    handleDragStart(
                      event,
                      task,
                      column.id
                    )
                  }
                  onDragEnd={handleDragEnd}
                >

                  <div className="task-card-top">

                    <span
                      className={`priority-badge ${task.priority}`}
                    >
                      {PRIORITIES.find(
                        (item) =>
                          item.value ===
                          task.priority
                      )?.label ||
                        task.priority}
                    </span>

                    <div className="task-actions">

                      <button
                        className="task-action-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditTask(task);
                        }}
                        title="Chỉnh sửa"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        className="task-action-btn danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTask(task);
                        }}
                        title="Xóa"
                      >
                        <Trash2 size={14} />
                      </button>

                    </div>

                  </div>

                  <h4 className="task-title">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="task-description">
                      {task.description}
                    </p>
                  )}

                  <div className="task-info">

                    <div
                      className="task-meta-item"
                      title="Giai đoạn"
                    >
                      <span className="phase-dot" />
                      <span>
                        {phases.find(
                          (phase) =>
                            phase.id ===
                            task.phase_id
                        )?.name ||
                          'Không xác định'}
                      </span>
                    </div>

                    {task.deadline && (
                      <div
                        className="task-meta-item"
                        title="Deadline"
                      >
                        <Clock size={14} />
                        <span>
                          {task.deadline}
                        </span>
                      </div>
                    )}

                    {task.comments > 0 && (
                      <div
                        className="task-meta-item"
                        title="Bình luận"
                      >
                        <MessageSquare size={14} />
                        <span>
                          {task.comments}
                        </span>
                      </div>
                    )}

                    {task.links > 0 && (
                      <div className="task-meta-item" title="Link đính kèm">
                        <Link2 size={14} />
                        <span>{task.links}</span>
                      </div>
                    )}

                  </div>

                  <div className="task-footer">

                    <div className="task-assignee-info">

                      <div className="assignee-avatar">
                        {task.assignee &&
                        task.assignee !==
                          'Chưa phân công'
                          ? task.assignee.charAt(
                              0
                            ).toUpperCase()
                          : '?'}
                      </div>

                      <span>
                        {task.assignee}
                      </span>

                    </div>

                  </div>

                </div>
              ))}

              {visibleTasks[column.id].length === 0 && (
                <div className="empty-column">
                  Chưa có task
                </div>
              )}

            </div>

            <button
              className="add-task-column-btn"
              onClick={() =>
                openCreateTask(column.id)
              }
              disabled={phases.length === 0}
            >
              <Plus size={15} />
              Thêm Task
            </button>

          </div>
        ))}

      </div>

      <section className="manager-my-tasks">
        <div className="manager-my-tasks-heading">
          <div>
            <h3>Công việc của tôi</h3>
            <p>Các công việc được giao cho bạn trong dự án này.</p>
          </div>
          <span>{myTasks.length} công việc</span>
        </div>

        {myTasks.length ? (
          <div className="manager-my-tasks-list">
            {myTasks.map((task) => (
              <div className="manager-my-task-group" key={task.id}>
                <button
                  type="button"
                  className="manager-my-task-item"
                  onClick={() => toggleMyTask(task)}
                >
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.assignee}</small>
                  </span>
                  <span className={`task-status status-${task.status}`}>
                    {COLUMNS.find((column) => column.id === task.status)?.label || task.status}
                    <span className="manager-task-chevron">
                      {expandedMyTaskId === task.id ? '▾' : '▸'}
                    </span>
                  </span>
                </button>
                {expandedMyTaskId === task.id && renderMyTaskDetail()}
              </div>
            ))}
          </div>
        ) : (
          <p className="manager-my-tasks-empty">Chưa có công việc được giao.</p>
        )}
      </section>

      {selectedTask && (
        <div className="modal-backdrop" onMouseDown={() => setSelectedTask(null)}>
          <div className="modal-panel glass-panel task-detail-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className={`priority-badge ${selectedTask.priority}`}>{selectedTask.priority}</span>
                <h2>{selectedTask.title}</h2>
                <p>{selectedTask.phases?.name || 'Chưa có phase'} · {selectedTask.assignee?.full_name || 'Chưa phân công'}</p>
              </div>
              <button className="icon-btn" onClick={() => setSelectedTask(null)}><X size={20} /></button>
            </div>
            {taskDetailLoading ? <div className="kanban-loading">Đang tải chi tiết...</div> : (
              <div className="task-detail-content">
                <section>
                  <h3>Mô tả</h3>
                  <p>{selectedTask.description || 'Chưa có mô tả.'}</p>
                </section>
                <section>
                  <h3>Link đính kèm ({selectedTask.task_links?.length || 0})</h3>
                  <div className="detail-links-list">
                    {(selectedTask.task_links || []).map((link) => (
                      <a key={link.id} href={link.url} target="_blank" rel="noreferrer">
                        <strong>{link.title || 'Link kết quả'}</strong><span>{link.url}</span>
                      </a>
                    ))}
                    {!selectedTask.task_links?.length && <p>Chưa có link.</p>}
                  </div>
                </section>
                <section>
                  <h3>Trao đổi ({selectedTask.task_comments?.length || 0})</h3>
                  <div className="detail-comments-list">
                    {(selectedTask.task_comments || []).map((item) => (
                      <div key={item.id}><strong>{item.employees?.full_name || 'Nhân viên'}</strong><p>{item.content}</p></div>
                    ))}
                    {!selectedTask.task_comments?.length && <p>Chưa có bình luận.</p>}
                  </div>
                  <form className="detail-comment-form" onSubmit={submitTaskComment}>
                    <textarea
                      value={taskComment}
                      onChange={(event) => setTaskComment(event.target.value)}
                      placeholder="Viết bình luận..."
                      rows="3"
                    />
                    <button type="submit" disabled={taskCommentSending}>
                      {taskCommentSending ? 'Đang gửi...' : 'Gửi bình luận'}
                    </button>
                  </form>
                </section>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TASK MODAL */}
      {showTaskForm && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !saving &&
            setShowTaskForm(false)
          }
        >

          <div
            className="modal-panel glass-panel task-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingTask
                    ? 'Chỉnh Sửa Task'
                    : 'Thêm Task'}
                </h2>

                <p>
                  Quản lý thông tin công việc.
                </p>
              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setShowTaskForm(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleTaskSubmit}>

              <div className="form-grid">

                <label className="full-width">
                  Tên công việc *
                  <input
                    className="form-input"
                    name="title"
                    value={taskForm.title}
                    onChange={handleTaskChange}
                    placeholder="VD: Thiết kế giao diện Login"
                  />
                </label>

                <label className="full-width">
                  Mô tả
                  <textarea
                    className="form-input"
                    name="description"
                    value={
                      taskForm.description
                    }
                    onChange={handleTaskChange}
                    placeholder="Mô tả công việc..."
                  />
                </label>

                <label>
                  Giai đoạn *
                  <select
                    className="form-input"
                    name="phase_id"
                    value={
                      taskForm.phase_id
                    }
                    onChange={handleTaskChange}
                  >
                    <option value="">
                      -- Chọn phase --
                    </option>

                    {phases.map((phase) => (
                      <option
                        key={phase.id}
                        value={phase.id}
                      >
                        {phase.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Người thực hiện
                  <select
                    className="form-input"
                    name="assignee_id"
                    value={
                      taskForm.assignee_id
                    }
                    onChange={handleTaskChange}
                  >
                    <option value="">
                      -- Chưa phân công --
                    </option>

                    {employees.map((employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.full_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Ưu tiên
                  <select
                    className="form-input"
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleTaskChange}
                  >
                    {PRIORITIES.map(
                      (priority) => (
                        <option
                          key={priority.value}
                          value={priority.value}
                        >
                          {priority.label}
                        </option>
                      )
                    )}
                  </select>
                </label>

                <label>
                  Trạng thái
                  <select
                    className="form-input"
                    name="status"
                    value={taskForm.status}
                    onChange={handleTaskChange}
                  >
                    {COLUMNS.map((column) => (
                      <option
                        key={column.id}
                        value={column.id}
                      >
                        {column.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Deadline
                  <input
                    type="date"
                    className="form-input"
                    name="deadline"
                    value={
                      taskForm.deadline
                    }
                    onChange={handleTaskChange}
                  />
                </label>

              </div>

              {formError && (
                <div className="form-error error-message">
                  {formError}
                </div>
              )}

              <div className="modal-actions">

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() =>
                    setShowTaskForm(false)
                  }
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <Save size={16} />

                  {saving
                    ? 'Đang lưu...'
                    : 'Lưu Task'}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}