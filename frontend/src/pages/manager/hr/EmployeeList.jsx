import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Plus, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import './HR.css';

export default function EmployeeList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [options, setOptions] = useState({ departments: [], positions: [] });
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ employee_code: '', full_name: '', email: '', password: '', phone: '', department_id: '', position_id: '', hire_date: '', status: 'active', role: 'employee' });

  useEffect(() => {
    let active = true;
    api.get('/employees')
      .then(({ data }) => { if (active) setEmployees(data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error || 'Không thể tải danh sách nhân viên.'); })
      .finally(() => { if (active) setLoading(false); });
    api.get('/employees/options')
      .then(({ data }) => { if (active) setOptions(data); })
      .catch(() => { if (active) setFormError('Không thể tải danh sách phòng ban và chức vụ.'); })
      .finally(() => { if (active) setOptionsLoading(false); });
    return () => { active = false; };
  }, []);

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const { data } = await api.post('/employees', form);
      setEmployees((current) => [...current, data].sort((first, second) => (first.code || '').localeCompare(second.code || '')));
      setForm({ employee_code: '', full_name: '', email: '', password: '', phone: '', department_id: '', position_id: '', hire_date: '', status: 'active', role: 'employee' });
      setShowForm(false);
    } catch (requestError) {
      setFormError(requestError.response?.data?.error || 'Không thể thêm nhân viên.');
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return employees.filter((employee) => {
      const matchesSearch = !normalizedSearch || employee.code?.toLowerCase().includes(normalizedSearch) || employee.name?.toLowerCase().includes(normalizedSearch);
      return matchesSearch && (statusFilter === 'all' || employee.status === statusFilter);
    });
  }, [employees, searchTerm, statusFilter]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Danh Sách Nhân Viên</h1>
        <button className="btn btn-primary" onClick={() => { setShowForm(true); setFormError(''); }}>
          <Plus size={18} style={{ marginRight: '8px' }} />
          Thêm Nhân Viên
        </button>
      </div>

      {showForm && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowForm(false)}>
        <form className="modal-panel glass-panel" onSubmit={handleCreate}>
          <div className="modal-header"><h2>Thêm nhân viên</h2><button type="button" className="icon-btn" onClick={() => setShowForm(false)}>×</button></div>
          <div className="form-grid">
            <label>Mã nhân viên<input className="form-input" name="employee_code" value={form.employee_code} onChange={updateForm} placeholder="NV005" /></label>
            <label>Họ tên *<input className="form-input" name="full_name" value={form.full_name} onChange={updateForm} required /></label>
            <label>Email *<input className="form-input" type="email" name="email" value={form.email} onChange={updateForm} required /></label>
            <label>Mật khẩu tài khoản *<input className="form-input" type="password" name="password" value={form.password} onChange={updateForm} minLength="6" required /></label>
            <label>Số điện thoại<input className="form-input" name="phone" value={form.phone} onChange={updateForm} /></label>
            <label>Phòng ban<select className="form-input" name="department_id" value={form.department_id} onChange={updateForm} disabled={optionsLoading}><option value="">{optionsLoading ? 'Đang tải phòng ban...' : 'Chọn phòng ban'}</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Chức vụ<select className="form-input" name="position_id" value={form.position_id} onChange={updateForm} disabled={optionsLoading}><option value="">{optionsLoading ? 'Đang tải chức vụ...' : 'Chọn chức vụ'}</option>{options.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Ngày vào làm<input className="form-input" type="date" name="hire_date" value={form.hire_date} onChange={updateForm} /></label>
            <label>Trạng thái<select className="form-input" name="status" value={form.status} onChange={updateForm}><option value="active">Đang làm việc</option><option value="on_leave">Đang nghỉ phép</option><option value="resigned">Đã nghỉ việc</option></select></label>
            <label>Vai trò tài khoản<select className="form-input" name="role" value={form.role} onChange={updateForm}><option value="employee">Nhân viên</option><option value="manager">Quản lý</option></select></label>
          </div>
          {formError && <p className="error-message form-error">{formError}</p>}
          <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Huỷ</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu nhân viên'}</button></div>
        </form>
      </div>}

      <div className="glass-panel table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={18} color="var(--text-secondary)" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo tên, mã NV..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <label className="filter-select">
            <Filter size={18} style={{ marginRight: '8px' }} />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái">
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang làm việc</option>
              <option value="on_leave">Đang nghỉ phép</option>
              <option value="resigned">Đã nghỉ việc</option>
            </select>
          </label>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Mã NV</th>
              <th>Họ Tên</th>
              <th>Phòng Ban</th>
              <th>Chức Vụ</th>
              <th>Email</th>
              <th>Trạng Thái</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="7" className="table-message">Đang tải dữ liệu...</td></tr>}
            {!loading && error && <tr><td colSpan="7" className="table-message error-message">{error}</td></tr>}
            {!loading && !error && filteredEmployees.length === 0 && <tr><td colSpan="7" className="table-message">Không tìm thấy nhân viên phù hợp.</td></tr>}
            {!loading && !error && filteredEmployees.map(emp => (
              <tr key={emp.id} onClick={() => navigate(`/manager/hr/${emp.id}`)} className="clickable-row">
                <td><strong>{emp.code}</strong></td>
                <td>{emp.name}</td>
                <td>{emp.department}</td>
                <td>{emp.position}</td>
                <td>{emp.email}</td>
                <td>
                  <span className={`badge ${emp.status}`}>
                    {emp.status.replace('_', ' ')}
                  </span>
                </td>
                <td>
                  <button className="icon-btn">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
