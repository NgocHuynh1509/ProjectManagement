import { useEffect, useMemo, useState } from 'react';
import { Search, Filter, Download, Calendar as CalendarIcon, Clock, FileText, Settings2, Monitor, Plus } from 'lucide-react';
import api from '../../../services/api';
import './Attendance.css';

const tabs = [
  { id: 'summary', label: 'Tổng hợp', icon: CalendarIcon },
  { id: 'logs', label: 'Nhật ký quét', icon: FileText },
  { id: 'rules', label: 'Quy tắc', icon: Settings2 },
  { id: 'devices', label: 'Thiết bị', icon: Monitor }
];

export default function AttendanceOverview() {
  const [activeTab, setActiveTab] = useState('summary');
  return <div className="page-container">
    <div className="page-header"><h1 className="page-title">Quản Lý Chấm Công</h1></div>
    <div className="attendance-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={`attendance-tab ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}><Icon size={17} />{label}</button>)}</div>
    {activeTab === 'summary' && <SummaryTab />}
    {activeTab === 'logs' && <LogsTab />}
    {activeTab === 'rules' && <RulesTab />}
    {activeTab === 'devices' && <DevicesTab />}
  </div>;
}

function SummaryTab() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.get('/attendance/summary', { params: { date } })
      .then(({ data }) => { if (active) setSummary(data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.error || 'Không thể tải dữ liệu chấm công.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [date]);

  const filteredSummary = useMemo(() => summary.filter((record) => {
    const query = searchTerm.trim().toLowerCase();
    return (!query || record.name?.toLowerCase().includes(query)) && (statusFilter === 'all' || record.status === statusFilter);
  }), [summary, searchTerm, statusFilter]);
  const stats = { normal: summary.filter((record) => record.status === 'normal').length, late: summary.filter((record) => record.status === 'late').length, absent: summary.filter((record) => record.status === 'absent').length, leave: summary.filter((record) => record.status === 'leave').length };
  const exportReport = () => {
    const header = ['Ngày', 'Nhân viên', 'Phòng ban', 'Giờ vào', 'Giờ ra', 'Giờ làm', 'Trễ (phút)', 'Về sớm (phút)', 'Tăng ca', 'Trạng thái'];
    const rows = filteredSummary.map((record) => [record.date, record.name, record.department, record.checkIn, record.checkOut, record.workHours, record.late, record.early, record.overtime, record.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }));
    link.download = `bao-cao-cham-cong-${date}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return <>
    <div className="attendance-actions"><button className="btn btn-outline" type="button" onClick={exportReport}><Download size={18} /> Xuất báo cáo</button></div>
    <div className="stats-row">
      <Stat title="Đi làm đủ" value={stats.normal} color="var(--status-active)" /><Stat title="Đi trễ" value={stats.late} color="var(--warning)" /><Stat title="Vắng mặt" value={stats.absent} color="var(--danger)" /><Stat title="Nghỉ phép" value={stats.leave} color="var(--info)" />
    </div>
    <div className="glass-panel table-container"><div className="table-toolbar"><div className="attendance-toolbar-group"><div className="search-box"><CalendarIcon size={18} /><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div><div className="search-box"><Search size={18} /><input placeholder="Tìm theo tên..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div></div><label className="filter-select"><Filter size={18} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="normal">Bình thường</option><option value="late">Đi trễ</option><option value="early_leave">Về sớm</option><option value="absent">Vắng mặt</option><option value="leave">Nghỉ phép</option><option value="holiday">Ngày lễ</option></select></label></div><table className="data-table"><thead><tr><th>Nhân viên</th><th>Phòng ban</th><th>Giờ vào</th><th>Giờ ra</th><th>Giờ làm</th><th>Trễ</th><th>Về sớm</th><th>Tăng ca</th><th>Trạng thái</th></tr></thead><tbody><TableState loading={loading} error={error} empty={!filteredSummary.length} colSpan="9" />{!loading && !error && filteredSummary.map((record) => <tr key={record.id}><td><strong>{record.name}</strong></td><td>{record.department}</td><td><Time value={record.checkIn} /></td><td><Time value={record.checkOut} /></td><td>{record.workHours}</td><td>{record.late}</td><td>{record.early}</td><td>{record.overtime}</td><td><span className={`badge ${record.status}`}>{record.status.replace('_', ' ')}</span></td></tr>)}</tbody></table></div>
  </>;
}

function LogsTab() {
  const [logs, setLogs] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { api.get('/attendance/logs').then(({ data }) => setLogs(data)).catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải nhật ký.')).finally(() => setLoading(false)); }, []);
  return <DataPanel title="Nhật ký quét mặt gần đây"><table className="data-table"><thead><tr><th>Nhân viên</th><th>Thiết bị</th><th>Thời gian</th><th>Loại quét</th><th>Ảnh</th></tr></thead><tbody><TableState loading={loading} error={error} empty={!logs.length} colSpan="5" />{!loading && !error && logs.map((log) => <tr key={log.id}><td>{log.employee}</td><td>{log.device}</td><td>{new Date(log.checkTime).toLocaleString('vi-VN')}</td><td>{log.checkType}</td><td>{log.imageUrl ? <a href={log.imageUrl} target="_blank" rel="noreferrer">Xem ảnh</a> : '-'}</td></tr>)}</tbody></table></DataPanel>;
}

function RulesTab() {
  const emptyForm = {
    name: '',
    work_start_time: '08:00',
    work_end_time: '17:30',
    late_threshold_minutes: 0,
    early_leave_threshold_minutes: 0,
    break_minutes: 60,
    overtime_after_minutes: '',
    applicable_department_id: ''
  };

  const [rules, setRules] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadRules = async () => {
    try {
      setLoading(true);

      const { data } =
        await api.get('/attendance/rules');

      setRules(data || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể tải quy tắc.'
      );
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const { data } =
        await api.get(
          '/attendance/rules/options'
        );

      setDepartments(
        data.departments || []
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể tải phòng ban.'
      );
    }
  };

  useEffect(() => {
    loadRules();
    loadDepartments();
  }, []);

  const openCreateForm = () => {
    setEditingRule(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  };

  const openEditForm = (rule) => {
    setEditingRule(rule);

    setForm({
      name: rule.name || '',

      work_start_time:
        rule.work_start_time?.slice(0, 5) ||
        '08:00',

      work_end_time:
        rule.work_end_time?.slice(0, 5) ||
        '17:30',

      late_threshold_minutes:
        rule.late_threshold_minutes ?? 0,

      early_leave_threshold_minutes:
        rule.early_leave_threshold_minutes ?? 0,

      break_minutes:
        rule.break_minutes ?? 60,

      overtime_after_minutes:
        rule.overtime_after_minutes ?? '',

      applicable_department_id:
        rule.applicable_department_id || ''
    });

    setError('');
    setShowForm(true);
  };

  const update = (event) => {
    const {
      name,
      value
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    setError('');
    setSaving(true);

    try {
      const payload = {
        ...form,

        late_threshold_minutes:
          Number(
            form.late_threshold_minutes
          ),

        early_leave_threshold_minutes:
          Number(
            form.early_leave_threshold_minutes
          ),

        break_minutes:
          Number(form.break_minutes),

        overtime_after_minutes:
          form.overtime_after_minutes === ''
            ? null
            : Number(
                form.overtime_after_minutes
              ),

        applicable_department_id:
          form.applicable_department_id ||
          null
      };

      if (editingRule) {
        await api.put(
          `/attendance/rules/${editingRule.id}`,
          payload
        );
      } else {
        await api.post(
          '/attendance/rules',
          payload
        );
      }

      setShowForm(false);
      setEditingRule(null);
      setForm(emptyForm);

      await loadRules();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể lưu quy tắc.'
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteRule = async (rule) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa quy tắc "${rule.name}" không?`
    );

    if (!confirmed) return;

    try {
      setError('');

      await api.delete(
        `/attendance/rules/${rule.id}`
      );

      await loadRules();
    } catch (requestError) {
      setError(
        requestError.response?.data?.error ||
        'Không thể xóa quy tắc.'
      );
    }
  };

  return (
    <DataPanel
      title="Quy tắc chấm công"
      error={error}
      action={
        <button
          className="btn btn-primary"
          type="button"
          onClick={openCreateForm}
        >
          <Plus size={17} />
          Thêm quy tắc
        </button>
      }
    >
      {showForm && (
        <RuleForm
          form={form}
          departments={departments}
          editingRule={editingRule}
          update={update}
          submit={submit}
          cancel={() => {
            setShowForm(false);
            setEditingRule(null);
          }}
          saving={saving}
        />
      )}

      {loading ? (
        <div className="table-message">
          Đang tải quy tắc...
        </div>
      ) : rules.length === 0 ? (
        <div className="table-message">
          Chưa có quy tắc chấm công.
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên ca</th>
                <th>Giờ làm</th>
                <th>Cho phép trễ</th>
                <th>Cho phép sớm</th>
                <th>Nghỉ giữa ca</th>
                <th>Tăng ca sau</th>
                <th>Phạm vi áp dụng</th>
                <th>Thao tác</th>
              </tr>
            </thead>

            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <strong>
                      {rule.name}
                    </strong>
                  </td>

                  <td>
                    {rule.work_start_time?.slice(0, 5)}
                    {' - '}
                    {rule.work_end_time?.slice(0, 5)}
                  </td>

                  <td>
                    {rule.late_threshold_minutes}
                    {' phút'}
                  </td>

                  <td>
                    {rule.early_leave_threshold_minutes}
                    {' phút'}
                  </td>

                  <td>
                    {rule.break_minutes}
                    {' phút'}
                  </td>

                  <td>
                    {rule.overtime_after_minutes ??
                      '-'}
                    {rule.overtime_after_minutes !== null &&
                    rule.overtime_after_minutes !== undefined
                      ? ' phút'
                      : ''}
                  </td>

                  <td>
                    {rule.applicable_department
                      ? rule.applicable_department.name
                      : 'Toàn công ty'}
                  </td>

                  <td>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="btn btn-outline btn-sm"
                        onClick={() =>
                          openEditForm(rule)
                        }
                      >
                        Sửa
                      </button>

                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() =>
                          deleteRule(rule)
                        }
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DataPanel>
  );
}

function DevicesTab() {
  const [devices, setDevices] = useState([]); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ device_code: '', device_name: '', location: '', ip_address: '' }); const [error, setError] = useState('');
  const load = () => api.get('/attendance/devices').then(({ data }) => setDevices(data)).catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải thiết bị.'));
  useEffect(() => { load(); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setError(''); try { await api.post('/attendance/devices', form); setShowForm(false); setForm({ device_code: '', device_name: '', location: '', ip_address: '' }); load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Không thể tạo thiết bị.'); } };
  return <DataPanel title="Thiết bị chấm công" action={<button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Thêm thiết bị</button>} error={error}>{showForm && <form className="inline-form" onSubmit={submit}>{Object.entries({ device_code: 'Mã thiết bị *', device_name: 'Tên thiết bị', location: 'Vị trí', ip_address: 'Địa chỉ IP' }).map(([name, label]) => <label key={name}>{label}<input className="form-input" name={name} value={form[name]} onChange={update} required={name === 'device_code'} /></label>)}<button className="btn btn-primary" type="submit">Lưu</button></form>}<table className="data-table"><thead><tr><th>Mã</th><th>Tên</th><th>Vị trí</th><th>IP</th><th>Trạng thái</th></tr></thead><tbody><TableState loading={false} error="" empty={!devices.length} colSpan="5" />{devices.map((device) => <tr key={device.id}><td>{device.device_code}</td><td>{device.device_name || '-'}</td><td>{device.location || '-'}</td><td>{device.ip_address || '-'}</td><td><span className="badge active">Đã cấu hình</span></td></tr>)}</tbody></table></DataPanel>;
}

function RuleForm({
  form,
  departments,
  editingRule,
  update,
  submit,
  cancel,
  saving
}) {
  return (
    <form
      className="attendance-rule-form"
      onSubmit={submit}
    >
      <div className="form-grid">
        <label>
          Tên ca *
          <input
            className="form-input"
            name="name"
            value={form.name}
            onChange={update}
            placeholder="VD: Ca hành chính"
            required
          />
        </label>

        <label>
          Phạm vi áp dụng
          <select
            className="form-input"
            name="applicable_department_id"
            value={
              form.applicable_department_id
            }
            onChange={update}
          >
            <option value="">
              Toàn công ty
            </option>

            {departments.map(
              (department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Giờ bắt đầu *
          <input
            className="form-input"
            type="time"
            name="work_start_time"
            value={form.work_start_time}
            onChange={update}
            required
          />
        </label>

        <label>
          Giờ kết thúc *
          <input
            className="form-input"
            type="time"
            name="work_end_time"
            value={form.work_end_time}
            onChange={update}
            required
          />
        </label>

        <label>
          Cho phép đi trễ
          <input
            className="form-input"
            type="number"
            min="0"
            name="late_threshold_minutes"
            value={
              form.late_threshold_minutes
            }
            onChange={update}
          />
        </label>

        <label>
          Cho phép về sớm
          <input
            className="form-input"
            type="number"
            min="0"
            name="early_leave_threshold_minutes"
            value={
              form.early_leave_threshold_minutes
            }
            onChange={update}
          />
        </label>

        <label>
          Nghỉ giữa ca
          <input
            className="form-input"
            type="number"
            min="0"
            name="break_minutes"
            value={form.break_minutes}
            onChange={update}
          />
        </label>

        <label>
          Tính tăng ca sau
          <input
            className="form-input"
            type="number"
            min="0"
            name="overtime_after_minutes"
            value={
              form.overtime_after_minutes
            }
            onChange={update}
            placeholder="VD: 30"
          />
        </label>
      </div>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={cancel}
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
            ? 'Đang lưu...'
            : editingRule
              ? 'Cập nhật quy tắc'
              : 'Lưu quy tắc'}
        </button>
      </div>
    </form>
  );
}
function DataPanel({ title, action, error, children }) { return <div className="glass-panel attendance-panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{error && <p className="error-message">{error}</p>}{children}</div>; }
function Stat({ title, value, color }) { return <div className="stat-card glass-panel"><div className="stat-title">{title}</div><div className="stat-value" style={{ color }}>{value}</div></div>; }
function Time({ value }) { return <span className="time-cell">{value !== '-' && <Clock size={14} />}{value}</span>; }
function TableState({ loading, error, empty, colSpan }) { if (loading) return <tr><td colSpan={colSpan} className="table-message">Đang tải dữ liệu...</td></tr>; if (error) return <tr><td colSpan={colSpan} className="table-message error-message">{error}</td></tr>; if (empty) return <tr><td colSpan={colSpan} className="table-message">Chưa có dữ liệu.</td></tr>; return null; }
