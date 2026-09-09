
// ============================================================
// frontend/src/pages/manager/projects/ProjectDetail.jsx
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Users,
  LayoutList,
  Grip,
  Plus,
  Trash2,
  X,
  Save
} from 'lucide-react';

import KanbanBoard from './KanbanBoard';
import api from '../../../services/api';
import './Projects.css';

const PROJECT_STATUS_LABELS = {
  planning: 'Đang lên kế hoạch',
  in_progress: 'Đang triển khai',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã huỷ'
};

const PHASE_STATUS_LABELS = {
  not_started: 'Chưa bắt đầu',
  in_progress: 'Đang thực hiện',
  completed: 'Hoàn thành'
};

const EMPTY_PHASE = {
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'not_started'
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('kanban');

  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showEditProject, setShowEditProject] =
    useState(false);

  const [showPhaseForm, setShowPhaseForm] =
    useState(false);

  const [showMemberForm, setShowMemberForm] =
    useState(false);

  const [editingPhase, setEditingPhase] =
    useState(null);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    manager_id: '',
    status: 'planning'
  });

  const [phaseForm, setPhaseForm] =
    useState(EMPTY_PHASE);

  const [memberForm, setMemberForm] = useState({
    employee_id: '',
    role_in_project: '',
    joined_at: new Date()
      .toISOString()
      .split('T')[0]
  });

  const loadProject = async () => {
    try {
      setLoading(true);
      setError('');

      const { data } = await api.get(
        `/projects/${projectId}`
      );

      setProject(data);

      setProjectForm({
        name: data.name || '',
        description: data.description || '',
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        manager_id: data.manager_id || '',
        status: data.status || 'planning'
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể tải chi tiết dự án.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const { data } = await api.get(
        '/projects/options'
      );

      setEmployees(data.employees || []);
    } catch (requestError) {
      console.error(requestError);
    }
  };

  useEffect(() => {
    loadProject();
    loadEmployees();
  }, [projectId]);

  const handleProjectChange = (event) => {
    const { name, value } = event.target;

    setProjectForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSaveProject = async (event) => {
    event.preventDefault();

    if (!projectForm.name.trim()) {
      setFormError('Tên dự án là bắt buộc.');
      return;
    }

    if (
      projectForm.start_date &&
      projectForm.end_date &&
      projectForm.start_date >
        projectForm.end_date
    ) {
      setFormError(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      );
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await api.put(
        `/projects/${projectId}`,
        {
          ...projectForm,
          manager_id:
            projectForm.manager_id || null
        }
      );

      setShowEditProject(false);

      await loadProject();
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.error ||
        'Không thể cập nhật dự án.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    const confirmed = window.confirm(
      'Bạn có chắc muốn xóa dự án này? Toàn bộ phase, task và thành viên thuộc dự án cũng sẽ bị xóa.'
    );

    if (!confirmed) return;

    try {
      await api.delete(`/projects/${projectId}`);

      navigate('/manager/projects');
    } catch (requestError) {
      window.alert(
        requestError.response?.data?.error ||
        'Không thể xóa dự án.'
      );
    }
  };

  const openCreatePhase = () => {
    setEditingPhase(null);
    setPhaseForm(EMPTY_PHASE);
    setFormError('');
    setShowPhaseForm(true);
  };

  const openEditPhase = (phase) => {
    setEditingPhase(phase);

    setPhaseForm({
      name: phase.name || '',
      description: phase.description || '',
      start_date: phase.start_date || '',
      end_date: phase.end_date || '',
      status: phase.status || 'not_started'
    });

    setFormError('');
    setShowPhaseForm(true);
  };

  const handlePhaseSubmit = async (event) => {
    event.preventDefault();

    if (!phaseForm.name.trim()) {
      setFormError('Tên giai đoạn là bắt buộc.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      if (editingPhase) {
        await api.put(
          `/projects/${projectId}/phases/${editingPhase.id}`,
          phaseForm
        );
      } else {
        await api.post(
          `/projects/${projectId}/phases`,
          phaseForm
        );
      }

      setShowPhaseForm(false);
      setEditingPhase(null);
      setPhaseForm(EMPTY_PHASE);

      await loadProject();
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.error ||
        'Không thể lưu giai đoạn.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePhase = async (phase) => {
    const confirmed = window.confirm(
      `Xóa giai đoạn "${phase.name}"? Các task trong giai đoạn cũng sẽ bị xóa.`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/projects/${projectId}/phases/${phase.id}`
      );

      await loadProject();
    } catch (requestError) {
      window.alert(
        requestError.response?.data?.error ||
        'Không thể xóa giai đoạn.'
      );
    }
  };

  const openMemberForm = () => {
    setMemberForm({
      employee_id: '',
      role_in_project: '',
      joined_at: new Date()
        .toISOString()
        .split('T')[0]
    });

    setFormError('');
    setShowMemberForm(true);
  };

  const handleMemberSubmit = async (event) => {
    event.preventDefault();

    if (!memberForm.employee_id) {
      setFormError('Vui lòng chọn nhân viên.');
      return;
    }

    try {
      setSaving(true);
      setFormError('');

      await api.post(
        `/projects/${projectId}/members`,
        memberForm
      );

      setShowMemberForm(false);

      await loadProject();
    } catch (requestError) {
      setFormError(
        requestError.response?.data?.error ||
        'Không thể thêm thành viên.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (member) => {
    const confirmed = window.confirm(
      `Xóa ${member.name} khỏi dự án?`
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/projects/${projectId}/members/${member.id}`
      );

      await loadProject();
    } catch (requestError) {
      window.alert(
        requestError.response?.data?.error ||
        'Không thể xóa thành viên.'
      );
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="glass-panel table-message">
          Đang tải dữ liệu dự án...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="glass-panel table-message error-message">
          {error}
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="page-container project-detail-page">

      {/* HEADER */}
      <div className="page-header project-detail-header">

        <div className="project-header-left">

          <button
            className="icon-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div className="project-title-row">
              <h1 className="page-title">
                {project.name}
              </h1>

              <span
                className={`badge ${project.status}`}
              >
                {PROJECT_STATUS_LABELS[
                  project.status
                ] || project.status}
              </span>
            </div>

            {project.description && (
              <p className="project-header-description">
                {project.description}
              </p>
            )}
          </div>

        </div>

        <div className="project-header-actions">

          <button
            className="btn btn-outline"
            onClick={() =>
              setShowEditProject(true)
            }
          >
            <Edit size={18} />
            Chỉnh sửa
          </button>

          <button
            className="btn btn-danger"
            onClick={handleDeleteProject}
          >
            <Trash2 size={18} />
            Xóa
          </button>

        </div>

      </div>

      {/* MAIN */}
      <div className="project-detail-layout">

        {/* SIDEBAR */}
        <aside className="project-sidebar glass-panel">

          <h3>Thông Tin Dự Án</h3>

          <div className="project-info-list">

            <div className="info-row">
              <span className="info-label">
                Quản lý
              </span>

              <span className="info-value">
                {project.manager?.full_name ||
                  'Chưa phân công'}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                Bắt đầu
              </span>

              <span className="info-value">
                {project.start_date || 'Chưa cập nhật'}
              </span>
            </div>

            <div className="info-row">
              <span className="info-label">
                Kết thúc
              </span>

              <span className="info-value">
                {project.end_date || 'Chưa cập nhật'}
              </span>
            </div>

          </div>

          <hr className="divider" />

          {/* PHASES */}
          <div className="phase-section-header">
            <h3>Giai Đoạn</h3>

            <button
              className="icon-btn small"
              title="Thêm giai đoạn"
              onClick={openCreatePhase}
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="phases-list">

            {(project.phases || []).map(
              (phase, index) => (
                <div
                  key={phase.id}
                  className="phase-item"
                >

                  <Grip
                    size={15}
                    className="drag-handle"
                  />

                  <div
                    className="phase-content"
                    onClick={() =>
                      openEditPhase(phase)
                    }
                  >
                    <span className="phase-name">
                      {index + 1}. {phase.name}
                    </span>

                    <span
                      className={`badge ${phase.status} small`}
                    >
                      {PHASE_STATUS_LABELS[
                        phase.status
                      ] || phase.status}
                    </span>
                  </div>

                  <button
                    className="phase-delete-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeletePhase(phase);
                    }}
                    title="Xóa phase"
                  >
                    <Trash2 size={14} />
                  </button>

                </div>
              )
            )}

            {(!project.phases ||
              project.phases.length === 0) && (
              <div className="empty-small">
                Chưa có giai đoạn.
              </div>
            )}

          </div>

          <button
            className="btn btn-outline btn-sm full-width-btn"
            onClick={openCreatePhase}
          >
            <Plus size={15} />
            Thêm Giai Đoạn
          </button>

        </aside>

        {/* MAIN VIEW */}
        <main className="project-main-view">

          <div className="view-tabs">

            <button
              className={`view-tab ${
                activeTab === 'kanban'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveTab('kanban')
              }
            >
              <LayoutList size={18} />
              Bảng Công Việc
            </button>

            <button
              className={`view-tab ${
                activeTab === 'members'
                  ? 'active'
                  : ''
              }`}
              onClick={() =>
                setActiveTab('members')
              }
            >
              <Users size={18} />
              Thành Viên
              <span className="tab-count">
                {project.members?.length || 0}
              </span>
            </button>

          </div>

          <div className="view-content glass-panel">

            {activeTab === 'kanban' && (
              <KanbanBoard
                projectId={projectId}
                phases={project.phases || []}
                employees={employees}
              />
            )}

            {activeTab === 'members' && (
              <div className="members-view">

                <div className="members-toolbar">
                  <div>
                    <h2>
                      Thành viên dự án
                    </h2>

                    <p>
                      Quản lý nhân viên tham gia dự án.
                    </p>
                  </div>

                  <button
                    className="btn btn-primary btn-sm"
                    onClick={openMemberForm}
                  >
                    <Plus size={16} />
                    Thêm Thành Viên
                  </button>
                </div>

                <div className="table-container">

                  <table className="data-table">

                    <thead>
                      <tr>
                        <th>Nhân viên</th>
                        <th>Phòng ban</th>
                        <th>Chức vụ</th>
                        <th>Vai trò</th>
                        <th>Ngày tham gia</th>
                        <th>Hành động</th>
                      </tr>
                    </thead>

                    <tbody>

                      {(project.members || []).map(
                        (member) => (
                          <tr key={member.id}>

                            <td>
                              <div className="member-name">
                                {member.name}
                              </div>

                              <div className="member-email">
                                {member.email}
                              </div>
                            </td>

                            <td>
                              {member.department}
                            </td>

                            <td>
                              {member.position}
                            </td>

                            <td>
                              <span className="role-chip">
                                {member.role ||
                                  'Chưa cập nhật'}
                              </span>
                            </td>

                            <td>
                              {member.joinedAt ||
                                'Chưa cập nhật'}
                            </td>

                            <td>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() =>
                                  handleRemoveMember(
                                    member
                                  )
                                }
                              >
                                <Trash2 size={14} />
                                Xóa
                              </button>
                            </td>

                          </tr>
                        )
                      )}

                      {(!project.members ||
                        project.members.length === 0) && (
                        <tr>
                          <td
                            colSpan="6"
                            className="table-message"
                          >
                            Chưa có thành viên.
                          </td>
                        </tr>
                      )}

                    </tbody>

                  </table>

                </div>

              </div>
            )}

          </div>

        </main>

      </div>

      {/* EDIT PROJECT MODAL */}
      {showEditProject && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !saving &&
            setShowEditProject(false)
          }
        >
          <div
            className="modal-panel glass-panel"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h2>Chỉnh Sửa Dự Án</h2>
                <p>
                  Cập nhật thông tin dự án.
                </p>
              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setShowEditProject(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProject}>

              <div className="form-grid">

                <label className="full-width">
                  Tên dự án *
                  <input
                    className="form-input"
                    name="name"
                    value={projectForm.name}
                    onChange={handleProjectChange}
                  />
                </label>

                <label className="full-width">
                  Mô tả
                  <textarea
                    className="form-input"
                    name="description"
                    value={projectForm.description}
                    onChange={handleProjectChange}
                  />
                </label>

                <label>
                  Ngày bắt đầu
                  <input
                    type="date"
                    className="form-input"
                    name="start_date"
                    value={
                      projectForm.start_date
                    }
                    onChange={handleProjectChange}
                  />
                </label>

                <label>
                  Ngày kết thúc
                  <input
                    type="date"
                    className="form-input"
                    name="end_date"
                    value={
                      projectForm.end_date
                    }
                    onChange={handleProjectChange}
                  />
                </label>

                <label>
                  Quản lý
                  <select
                    className="form-input"
                    name="manager_id"
                    value={
                      projectForm.manager_id
                    }
                    onChange={handleProjectChange}
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
                    value={projectForm.status}
                    onChange={handleProjectChange}
                  >
                    {Object.entries(
                      PROJECT_STATUS_LABELS
                    ).map(
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
                  onClick={() =>
                    setShowEditProject(false)
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
                    : 'Lưu thay đổi'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* PHASE MODAL */}
      {showPhaseForm && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !saving &&
            setShowPhaseForm(false)
          }
        >
          <div
            className="modal-panel glass-panel"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h2>
                  {editingPhase
                    ? 'Chỉnh Sửa Giai Đoạn'
                    : 'Thêm Giai Đoạn'}
                </h2>
              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setShowPhaseForm(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePhaseSubmit}>

              <div className="form-grid">

                <label className="full-width">
                  Tên giai đoạn *
                  <input
                    className="form-input"
                    value={phaseForm.name}
                    onChange={(event) =>
                      setPhaseForm({
                        ...phaseForm,
                        name: event.target.value
                      })
                    }
                    placeholder="VD: Phân tích yêu cầu"
                  />
                </label>

                <label className="full-width">
                  Mô tả
                  <textarea
                    className="form-input"
                    value={phaseForm.description}
                    onChange={(event) =>
                      setPhaseForm({
                        ...phaseForm,
                        description:
                          event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Ngày bắt đầu
                  <input
                    type="date"
                    className="form-input"
                    value={phaseForm.start_date}
                    onChange={(event) =>
                      setPhaseForm({
                        ...phaseForm,
                        start_date:
                          event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Ngày kết thúc
                  <input
                    type="date"
                    className="form-input"
                    value={phaseForm.end_date}
                    onChange={(event) =>
                      setPhaseForm({
                        ...phaseForm,
                        end_date:
                          event.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Trạng thái
                  <select
                    className="form-input"
                    value={phaseForm.status}
                    onChange={(event) =>
                      setPhaseForm({
                        ...phaseForm,
                        status:
                          event.target.value
                      })
                    }
                  >
                    {Object.entries(
                      PHASE_STATUS_LABELS
                    ).map(
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
                  onClick={() =>
                    setShowPhaseForm(false)
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
                    : 'Lưu'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

      {/* MEMBER MODAL */}
      {showMemberForm && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            !saving &&
            setShowMemberForm(false)
          }
        >
          <div
            className="modal-panel glass-panel modal-small"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >

            <div className="modal-header">
              <div>
                <h2>Thêm Thành Viên</h2>
                <p>
                  Chọn nhân viên tham gia dự án.
                </p>
              </div>

              <button
                className="icon-btn"
                onClick={() =>
                  setShowMemberForm(false)
                }
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleMemberSubmit}>

              <div className="form-grid one-column">

                <label>
                  Nhân viên *
                  <select
                    className="form-input"
                    value={
                      memberForm.employee_id
                    }
                    onChange={(event) =>
                      setMemberForm({
                        ...memberForm,
                        employee_id:
                          event.target.value
                      })
                    }
                  >
                    <option value="">
                      -- Chọn nhân viên --
                    </option>

                    {employees
                      .filter(
                        (employee) =>
                          !(project.members || [])
                            .some(
                              (member) =>
                                member.id ===
                                employee.id
                            )
                      )
                      .map((employee) => (
                        <option
                          key={employee.id}
                          value={employee.id}
                        >
                          {employee.full_name}
                          {employee.employee_code
                            ? ` (${employee.employee_code})`
                            : ''}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Vai trò trong dự án
                  <input
                    className="form-input"
                    value={
                      memberForm.role_in_project
                    }
                    onChange={(event) =>
                      setMemberForm({
                        ...memberForm,
                        role_in_project:
                          event.target.value
                      })
                    }
                    placeholder="VD: Business Analyst"
                  />
                </label>

                <label>
                  Ngày tham gia
                  <input
                    type="date"
                    className="form-input"
                    value={
                      memberForm.joined_at
                    }
                    onChange={(event) =>
                      setMemberForm({
                        ...memberForm,
                        joined_at:
                          event.target.value
                      })
                    }
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
                    setShowMemberForm(false)
                  }
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang thêm...'
                    : 'Thêm thành viên'}
                </button>

              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
