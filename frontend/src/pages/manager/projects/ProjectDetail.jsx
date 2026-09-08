import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Users, Calendar, LayoutList, Grip } from 'lucide-react';
import KanbanBoard from './KanbanBoard';
import api from '../../../services/api';
import './Projects.css';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('kanban');
  const [project, setProject] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/projects/${projectId}`)
      .then(({ data }) => setProject(data))
      .catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải chi tiết dự án.'));
  }, [projectId]);

  if (error) return <div className="page-container"><div className="glass-panel table-message error-message">{error}</div></div>;
  if (!project) return <div className="page-container"><div className="glass-panel table-message">Đang tải dữ liệu dự án...</div></div>;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--header-height) - 48px)' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="icon-btn" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="page-title" style={{ marginBottom: '4px' }}>{project.name}</h1>
            <span className={`badge ${project.status}`}>{project.status.replace('_', ' ')}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline">
            <Edit size={18} style={{ marginRight: '8px' }} />
            Chỉnh sửa
          </button>
          <button className="btn btn-primary">
            Cập nhật trạng thái
          </button>
        </div>
      </div>

      <div className="project-detail-layout">
        {/* Info Sidebar */}
        <div className="project-sidebar glass-panel">
          <h3>Thông Tin Dự Án</h3>
          <div className="project-info-list">
            <div className="info-row">
              <span className="info-label">Quản lý</span>
              <span className="info-value">{project.manager?.full_name || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Bắt đầu</span>
              <span className="info-value">{project.start_date || 'Chưa cập nhật'}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Kết thúc (Dự kiến)</span>
              <span className="info-value">{project.end_date || 'Chưa cập nhật'}</span>
            </div>
          </div>
          
          <hr className="divider" />
          
          <h3>Giai Đoạn (Phases)</h3>
          <div className="phases-list">
            {(project.phases || []).map((phase, index) => (
              <div key={phase.id} className="phase-item">
                <Grip size={14} className="drag-handle" />
                <div className="phase-content">
                  <span className="phase-name">{index + 1}. {phase.name}</span>
                  <span className={`badge ${phase.status} small`}>{phase.status.replace('_', ' ')}</span>
                </div>
              </div>
            ))}
            <button className="btn btn-outline btn-sm" style={{ width: '100%', marginTop: '12px' }}>
              + Thêm Giai Đoạn
            </button>
          </div>
        </div>

        {/* Main View Area */}
        <div className="project-main-view">
          <div className="view-tabs">
            <button 
              className={`view-tab ${activeTab === 'kanban' ? 'active' : ''}`}
              onClick={() => setActiveTab('kanban')}
            >
              <LayoutList size={18} />
              Bảng Công Việc (Kanban)
            </button>
            <button 
              className={`view-tab ${activeTab === 'members' ? 'active' : ''}`}
              onClick={() => setActiveTab('members')}
            >
              <Users size={18} />
              Thành Viên Tham Gia
            </button>
          </div>

          <div className="view-content glass-panel">
            {activeTab === 'kanban' && <KanbanBoard projectId={projectId} />}
            {activeTab === 'members' && (
              <div className="members-view">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                  <button className="btn btn-primary btn-sm">+ Thêm Thành Viên</button>
                </div>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Họ Tên</th>
                      <th>Phòng Ban</th>
                      <th>Vai Trò Trong Dự Án</th>
                      <th>Ngày Tham Gia</th>
                      <th>Hành Động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(project.members || []).map((member) => <tr key={member.id}>
                      <td>{member.name}</td><td>{member.department}</td><td>{member.role || 'Chưa cập nhật'}</td><td>{member.joinedAt || 'Chưa cập nhật'}</td>
                      <td><button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)' }}>Xoá</button></td>
                    </tr>)}
                    {!project.members?.length && <tr><td colSpan="5" className="table-message">Chưa có thành viên.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
