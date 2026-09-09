
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
  User
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
  employees = []
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
            Kéo task giữa các cột để cập nhật
            trạng thái.
          </p>
        </div>

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
                {tasks[column.id].length}
              </span>

            </div>

            <div className="kanban-tasks">

              {tasks[column.id].map((task) => (
                <div
                  key={task.id}
                  className="task-card glass-panel"
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
                        onClick={() =>
                          openEditTask(task)
                        }
                        title="Chỉnh sửa"
                      >
                        <Edit size={14} />
                      </button>

                      <button
                        className="task-action-btn danger"
                        onClick={() =>
                          handleDeleteTask(task)
                        }
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

              {tasks[column.id].length === 0 && (
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