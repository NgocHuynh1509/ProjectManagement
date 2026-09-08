import { useEffect, useState } from 'react';
import { Plus, Clock, MessageSquare } from 'lucide-react';
import api from '../../../services/api';
import './Projects.css';

const COLUMNS = [
  { id: 'todo', label: 'Cần làm (Todo)', color: 'var(--status-resigned)' },
  { id: 'in_progress', label: 'Đang làm (In Progress)', color: 'var(--status-in-progress)' },
  { id: 'review', label: 'Chờ duyệt (Review)', color: 'var(--status-on-leave)' },
  { id: 'done', label: 'Hoàn thành (Done)', color: 'var(--status-active)' },
];

export default function KanbanBoard({ projectId }) {
  const [tasks, setTasks] = useState({ todo: [], in_progress: [], review: [], done: [] });
  const [draggedTask, setDraggedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/projects/${projectId}/tasks`)
      .then(({ data }) => {
        setTasks(data.reduce((columns, task) => {
          const status = columns[task.status] ? task.status : 'todo';
          columns[status].push(task);
          return columns;
        }, { todo: [], in_progress: [], review: [], done: [] }));
      })
      .catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải danh sách công việc.'))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleDragStart = (e, task, sourceColumn) => {
    setDraggedTask({ ...task, sourceColumn });
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to prevent the dragged element from disappearing immediately
    setTimeout(() => {
      e.target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
    setDraggedTask(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetColumnId) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.sourceColumn === targetColumnId) return;

    setTasks(prev => {
      const sourceCol = [...prev[draggedTask.sourceColumn]];
      const targetCol = [...prev[targetColumnId]];
      
      const taskIndex = sourceCol.findIndex(t => t.id === draggedTask.id);
      const [movedTask] = sourceCol.splice(taskIndex, 1);
      
      targetCol.push(movedTask);

      return {
        ...prev,
        [draggedTask.sourceColumn]: sourceCol,
        [targetColumnId]: targetCol.map(task => task.id === draggedTask.id ? { ...task, status: targetColumnId } : task)
      };
    });

    api.put(`/projects/tasks/${draggedTask.id}/status`, { status: targetColumnId })
      .catch(() => {
        setError('Không thể lưu trạng thái công việc. Vui lòng tải lại trang.');
      });
  };

  return (
    <div className="kanban-container">
      {loading && <div className="table-message">Đang tải công việc...</div>}
      {error && <div className="table-message error-message">{error}</div>}
      {COLUMNS.map(column => (
        <div 
          key={column.id} 
          className="kanban-column"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="column-header" style={{ borderTopColor: column.color }}>
            <span className="column-title">{column.label}</span>
            <span className="task-count">{tasks[column.id].length}</span>
          </div>
          
          <div className="kanban-tasks">
            {tasks[column.id].map(task => (
              <div 
                key={task.id} 
                className="task-card glass-panel"
                draggable
                onDragStart={(e) => handleDragStart(e, task, column.id)}
                onDragEnd={handleDragEnd}
              >
                <div className="task-labels">
                  <span className={`badge ${task.priority} small`}>{task.priority}</span>
                </div>
                <h4 className="task-title">{task.title}</h4>
                
                <div className="task-footer">
                  <div className="task-meta">
                    <div className="meta-icon" title="Deadline">
                      <Clock size={14} />
                      <span>{task.deadline}</span>
                    </div>
                    {task.comments > 0 && (
                      <div className="meta-icon" title="Bình luận">
                        <MessageSquare size={14} />
                        <span>{task.comments}</span>
                      </div>
                    )}
                  </div>
                  <div className="task-assignee" title={task.assignee}>
                    {task.assignee?.charAt(0) || '?'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="add-task-btn">
            <Plus size={16} /> Thêm Task
          </button>
        </div>
      ))}
    </div>
  );
}
