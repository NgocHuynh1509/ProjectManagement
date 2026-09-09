
// ============================================================
// frontend/src/pages/manager/projects/ProjectList.jsx
// ============================================================

import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Filter, Calendar, Users, CheckCircle2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './Projects.css';

const EMPTY_FORM = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  manager_id: '',
  status: 'planning'
};

const STATUS_LABELS = {
  planning: 'Đang lên kế hoạch',
  in_progress: 'Đang triển khai',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã huỷ'
};

export default function ProjectList() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get('/projects');

      setProjects(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể tải danh sách dự án.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const { data } = await api.get('/projects/options');

      setEmployees(data.employees || []);
    } catch (requestError) {
      console.error('Cannot load project options:', requestError);
    }
  };

  useEffect(() => {
    loadProjects();
    loadOptions();
  }, []);

  const filteredProjects = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesSearch =
        !query ||
        project.name?.toLowerCase().includes(query) ||
        project.manager?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        project.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleOpenCreate = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowForm(true);
  };

  const handleCloseForm = () => {
    if (saving) return;

    setShowForm(false);
    setFormError('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setFormError('Vui lòng nhập tên dự án.');
      return;
    }

    if (
      form.start_date &&
      form.end_date &&
      form.start_date > form.end_date
    ) {
      setFormError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await api.post('/projects', {
        ...form,
        manager_id: form.manager_id || null
      });

      setShowForm(false);
      setForm(EMPTY_FORM);

      await loadProjects();
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.error ||
        'Không thể tạo dự án.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1 className="page-title">Quản Lý Dự Án</h1>
          <p className="page-subtitle">
            Quản lý dự án, giai đoạn, công việc và thành viên.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleOpenCreate}
        >
          <Plus size={18} />
          Tạo Dự Án Mới
        </button>
      </div>

      {/* FILTER */}
      <div className="filters-bar glass-panel">

        <div className="search-box">
          <Search size={18} color="var(--text-secondary)" />

          <input
            type="text"
            placeholder="Tìm kiếm dự án hoặc quản lý..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <label className="filter-select">
          <Filter size={18} />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value)
            }
          >
            <option value="all">
              Tất cả trạng thái
            </option>

            {Object.entries(STATUS_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

      </div>

      {/* CONTENT */}
      <div className="projects-grid">

        {loading && (
          <div className="glass-panel table-message">
            Đang tải dữ liệu...
          </div>
        )}

        {!loading && error && (
          <div className="glass-panel table-message error-message">
            {error}
          </div>
        )}

        {!loading &&
          !error &&
          filteredProjects.length === 0 && (
            <div className="glass-panel table-message">
              Không có dự án phù hợp.
            </div>
          )}

        {!loading &&
          !error &&
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="project-card glass-panel"
              onClick={() =>
                navigate(
                  `/manager/projects/${project.id}`
                )
              }
            >

              <div className="project-card-header">

                <div>
                  <h3 className="project-title">
                    {project.name}
                  </h3>

                  <span className="project-manager">
                    {project.manager}
                  </span>
                </div>

                <span
                  className={`badge ${project.status}`}
                >
                  {STATUS_LABELS[project.status] ||
                    project.status}
                </span>

              </div>

              {project.description && (
                <p className="project-description">
                  {project.description}
                </p>
              )}

              <div className="project-meta">

                <div className="meta-item">
                  <Users size={16} />

                  <span>
                    Quản lý: {project.manager}
                  </span>
                </div>

                <div className="meta-item">
                  <Calendar size={16} />

                  <span>
                    {project.startDate || '—'}
                    {' → '}
                    {project.endDate || '—'}
                  </span>
                </div>

                <div className="meta-item">
                  <CheckCircle2 size={16} />

                  <span>
                    {project.tasksCount} task
                  </span>
                </div>

              </div>

              <div className="project-progress">

                <div className="progress-header">
                  <span>Tiến độ</span>

                  <strong>
                    {project.progress}%
                  </strong>
                </div>

                <div className="progress-bg">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${project.progress}%`
                    }}
                  />
                </div>

              </div>

            </div>
          ))}

      </div>

      {/* CREATE PROJECT MODAL */}
      {showForm && (
        <div
          className="modal-backdrop"
          onMouseDown={handleCloseForm}
        >
          <div
            className="modal-panel glass-panel project-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h2>Tạo Dự Án Mới</h2>
                <p>
                  Nhập thông tin cơ bản của dự án.
                </p>
              </div>

              <button
                className="icon-btn"
                onClick={handleCloseForm}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <label className="full-width">
                  Tên dự án *
                  <input
                    className="form-input"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="VD: Hệ thống quản lý nhân sự"
                  />
                </label>

                <label className="full-width">
                  Mô tả
                  <textarea
                    className="form-input"
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Mô tả dự án..."
                  />
                </label>

                <label>
                  Ngày bắt đầu
                  <input
                    type="date"
                    className="form-input"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Ngày kết thúc
                  <input
                    type="date"
                    className="form-input"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                  />
                </label>

                <label>
                  Quản lý dự án
                  <select
                    className="form-input"
                    name="manager_id"
                    value={form.manager_id}
                    onChange={handleChange}
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
                  Trạng thái
                  <select
                    className="form-input"
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                  >
                    {Object.entries(STATUS_LABELS).map(
                      ([value, label]) => (
                        <option
                          key={value}
                          value={value}
                        >
                          {label}
                        </option>
                      )
                    )}
                  </select>
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
                  onClick={handleCloseForm}
                  disabled={saving}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang tạo...'
                    : 'Tạo dự án'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
