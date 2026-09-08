import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Calendar, Users as UsersIcon, CheckCircle2 } from 'lucide-react';
import api from '../../../services/api';
import './Projects.css';

export default function ProjectList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects')
      .then(({ data }) => setProjects(data))
      .catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải danh sách dự án.'))
      .finally(() => setLoading(false));
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesSearch = !query || project.name?.toLowerCase().includes(query) || project.manager?.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || project.status === statusFilter);
    });
  }, [projects, searchTerm, statusFilter]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Quản Lý Dự Án</h1>
        <button className="btn btn-primary">
          <Plus size={18} style={{ marginRight: '8px' }} />
          Tạo Dự Án Mới
        </button>
      </div>

      <div className="filters-bar glass-panel">
        <div className="search-box">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Tìm kiếm dự án..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <label className="filter-select">
            <Filter size={18} style={{ marginRight: '8px' }} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái dự án">
              <option value="all">Tất cả trạng thái</option>
              <option value="planning">Đang lên kế hoạch</option>
              <option value="in_progress">Đang triển khai</option>
              <option value="completed">Đã hoàn thành</option>
              <option value="cancelled">Đã huỷ</option>
            </select>
          </label>
        </div>
      </div>

      <div className="projects-grid">
        {loading && <div className="table-message">Đang tải dữ liệu...</div>}
        {!loading && error && <div className="table-message error-message">{error}</div>}
        {!loading && !error && filteredProjects.length === 0 && <div className="table-message">Không có dự án phù hợp.</div>}
        {!loading && !error && filteredProjects.map(project => (
          <div 
            key={project.id} 
            className="project-card glass-panel"
            onClick={() => navigate(`/manager/projects/${project.id}`)}
          >
            <div className="project-card-header">
              <h3 className="project-title">{project.name}</h3>
              <span className={`badge ${project.status}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="project-meta">
              <div className="meta-item">
                <UsersIcon size={16} />
                <span>Quản lý: {project.manager}</span>
              </div>
              <div className="meta-item">
                <Calendar size={16} />
                <span>{project.startDate} - {project.endDate}</span>
              </div>
              <div className="meta-item">
                <CheckCircle2 size={16} />
                <span>Tổng số task: {project.tasksCount}</span>
              </div>
            </div>

            <div className="project-progress">
              <div className="progress-header">
                <span>Tiến độ</span>
                <span>{project.progress}%</span>
              </div>
              <div className="progress-bg">
                <div 
                  className="progress-bar" 
                  style={{ 
                    width: `${project.progress}%`, 
                    backgroundColor: project.progress === 100 ? 'var(--status-completed)' : 'var(--primary)' 
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
