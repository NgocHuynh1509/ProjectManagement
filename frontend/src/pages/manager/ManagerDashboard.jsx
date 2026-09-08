import { useEffect, useState } from 'react';
import { Users, Briefcase, AlertCircle, Clock } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import api from '../../services/api';
import './Dashboard.css';

export default function ManagerDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/stats')
        .then(({ data }) => {
            console.log('✅ DASHBOARD API DATA:', data);
            setDashboard(data);
        })
        .catch((requestError) => {
            console.error('❌ DASHBOARD API ERROR:', requestError);
            console.error('Status:', requestError.response?.status);
            console.error('Data:', requestError.response?.data);
            console.error('URL:', requestError.config?.url);

            setError(
                requestError.response?.data?.error ||
                requestError.message ||
                'Không thể tải dữ liệu dashboard.'
            );
        });
}, []);

  const stats = dashboard || { activeEmployees: 0, activeProjects: 0, overdueTasks: 0, attendanceIssues: 0, overtimeData: [], recentActivities: [] };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Tổng Quan (Dashboard)</h1>
      </div>

      {/* KPI Widgets */}
      <div className="widgets-grid">
        <div className="widget-card glass-panel">
          <div className="widget-icon" style={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div className="widget-info">
            <span className="widget-label">Nhân Viên Active</span>
            <span className="widget-value">{stats.activeEmployees}</span>
          </div>
        </div>

        <div className="widget-card glass-panel">
          <div className="widget-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--secondary)' }}>
            <Briefcase size={24} />
          </div>
          <div className="widget-info">
            <span className="widget-label">Dự Án Đang Chạy</span>
            <span className="widget-value">{stats.activeProjects}</span>
          </div>
        </div>

        <div className="widget-card glass-panel">
          <div className="widget-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
            <AlertCircle size={24} />
          </div>
          <div className="widget-info">
            <span className="widget-label">Task Quá Hạn</span>
            <span className="widget-value">{stats.overdueTasks}</span>
          </div>
        </div>

        <div className="widget-card glass-panel">
          <div className="widget-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
            <Clock size={24} />
          </div>
          <div className="widget-info">
            <span className="widget-label">Vắng / Đi Trễ (Hôm Nay)</span>
            <span className="widget-value">{stats.attendanceIssues}</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Chart Section */}
        <div className="chart-section glass-panel">
          <h2>Biểu Đồ Tăng Ca (Tuần)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.overtimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-secondary)" />
                <YAxis stroke="var(--text-secondary)" />
                <Tooltip 
                  cursor={{fill: 'var(--bg-surface-hover)'}}
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', border: 'none', borderRadius: '8px', boxShadow: 'var(--glass-shadow)' }}
                />
                <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="activities-section glass-panel">
          <h2>Hoạt Động Gần Đây</h2>
          <div className="activity-list">
            {error && <p className="error-message">{error}</p>}
            {!error && stats.recentActivities.length === 0 && <p className="activity-time">Chưa có hoạt động gần đây.</p>}
            {!error && stats.recentActivities.map((activity) => (
              <div className="activity-item" key={activity.id}>
                <div className="activity-indicator" style={{ backgroundColor: activity.type === 'task' ? 'var(--info)' : activity.type === 'project' ? 'var(--secondary)' : 'var(--warning)' }}></div>
                <div className="activity-details">
                  <p>{activity.text}</p>
                  <span className="activity-time">{new Date(activity.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
