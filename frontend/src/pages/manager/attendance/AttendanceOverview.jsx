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
  const [rules, setRules] = useState([]); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ name: '', work_start_time: '08:00', work_end_time: '17:30', late_threshold_minutes: 0, early_leave_threshold_minutes: 0, break_minutes: 60, overtime_after_minutes: '' }); const [error, setError] = useState('');
  const load = () => api.get('/attendance/rules').then(({ data }) => setRules(data)).catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải quy tắc.'));
  useEffect(() => { load(); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setError(''); try { await api.post('/attendance/rules', form); setShowForm(false); setForm({ name: '', work_start_time: '08:00', work_end_time: '17:30', late_threshold_minutes: 0, early_leave_threshold_minutes: 0, break_minutes: 60, overtime_after_minutes: '' }); load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Không thể tạo quy tắc.'); } };
  return <DataPanel title="Quy tắc chấm công" action={<button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Thêm quy tắc</button>} error={error}>{showForm && <RuleForm form={form} update={update} submit={submit} cancel={() => setShowForm(false)} />}{!rules.length && !showForm ? <div className="table-message">Chưa có quy tắc.</div> : <table className="data-table"><thead><tr><th>Tên ca</th><th>Giờ làm</th><th>Cho phép trễ</th><th>Cho phép sớm</th><th>Nghỉ giữa ca</th><th>Tăng ca sau</th></tr></thead><tbody>{rules.map((rule) => <tr key={rule.id}><td>{rule.name}</td><td>{rule.work_start_time} - {rule.work_end_time}</td><td>{rule.late_threshold_minutes} phút</td><td>{rule.early_leave_threshold_minutes} phút</td><td>{rule.break_minutes} phút</td><td>{rule.overtime_after_minutes || '-'} phút</td></tr>)}</tbody></table>}</DataPanel>;
}

function DevicesTab() {
  const [devices, setDevices] = useState([]); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ device_code: '', device_name: '', location: '', ip_address: '' }); const [error, setError] = useState('');
  const load = () => api.get('/attendance/devices').then(({ data }) => setDevices(data)).catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải thiết bị.'));
  useEffect(() => { load(); }, []);
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setError(''); try { await api.post('/attendance/devices', form); setShowForm(false); setForm({ device_code: '', device_name: '', location: '', ip_address: '' }); load(); } catch (requestError) { setError(requestError.response?.data?.error || 'Không thể tạo thiết bị.'); } };
  return <DataPanel title="Thiết bị chấm công" action={<button className="btn btn-primary" onClick={() => setShowForm(!showForm)}><Plus size={17} /> Thêm thiết bị</button>} error={error}>{showForm && <form className="inline-form" onSubmit={submit}>{Object.entries({ device_code: 'Mã thiết bị *', device_name: 'Tên thiết bị', location: 'Vị trí', ip_address: 'Địa chỉ IP' }).map(([name, label]) => <label key={name}>{label}<input className="form-input" name={name} value={form[name]} onChange={update} required={name === 'device_code'} /></label>)}<button className="btn btn-primary" type="submit">Lưu</button></form>}<table className="data-table"><thead><tr><th>Mã</th><th>Tên</th><th>Vị trí</th><th>IP</th><th>Trạng thái</th></tr></thead><tbody><TableState loading={false} error="" empty={!devices.length} colSpan="5" />{devices.map((device) => <tr key={device.id}><td>{device.device_code}</td><td>{device.device_name || '-'}</td><td>{device.location || '-'}</td><td>{device.ip_address || '-'}</td><td><span className="badge active">Đã cấu hình</span></td></tr>)}</tbody></table></DataPanel>;
}

function RuleForm({ form, update, submit, cancel }) { return <form className="inline-form" onSubmit={submit}><label>Tên ca *<input className="form-input" name="name" value={form.name} onChange={update} required /></label><label>Giờ vào<input className="form-input" type="time" name="work_start_time" value={form.work_start_time} onChange={update} required /></label><label>Giờ ra<input className="form-input" type="time" name="work_end_time" value={form.work_end_time} onChange={update} required /></label><label>Cho phép trễ (phút)<input className="form-input" type="number" min="0" name="late_threshold_minutes" value={form.late_threshold_minutes} onChange={update} /></label><label>Cho phép sớm (phút)<input className="form-input" type="number" min="0" name="early_leave_threshold_minutes" value={form.early_leave_threshold_minutes} onChange={update} /></label><label>Nghỉ giữa ca (phút)<input className="form-input" type="number" min="0" name="break_minutes" value={form.break_minutes} onChange={update} /></label><label>Tăng ca sau (phút)<input className="form-input" type="number" min="0" name="overtime_after_minutes" value={form.overtime_after_minutes} onChange={update} /></label><div className="form-actions"><button type="button" className="btn btn-outline" onClick={cancel}>Huỷ</button><button type="submit" className="btn btn-primary">Lưu quy tắc</button></div></form>; }
function DataPanel({ title, action, error, children }) { return <div className="glass-panel attendance-panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{error && <p className="error-message">{error}</p>}{children}</div>; }
function Stat({ title, value, color }) { return <div className="stat-card glass-panel"><div className="stat-title">{title}</div><div className="stat-value" style={{ color }}>{value}</div></div>; }
function Time({ value }) { return <span className="time-cell">{value !== '-' && <Clock size={14} />}{value}</span>; }
function TableState({ loading, error, empty, colSpan }) { if (loading) return <tr><td colSpan={colSpan} className="table-message">Đang tải dữ liệu...</td></tr>; if (error) return <tr><td colSpan={colSpan} className="table-message error-message">{error}</td></tr>; if (empty) return <tr><td colSpan={colSpan} className="table-message">Chưa có dữ liệu.</td></tr>; return null; }
