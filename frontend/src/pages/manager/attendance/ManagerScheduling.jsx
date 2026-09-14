import { useEffect, useState } from 'react';
import { CalendarClock, CalendarDays, Plus, Trash2, Users, X } from 'lucide-react';
import api from '../../../services/api';

const weekdays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const emptyShift = { code: '', name: '', start_time: '08:00', end_time: '17:30', break_minutes: 60 };
const emptySchedule = { department_id: '', shift_id: '', weekday: 1, effective_from: new Date().toISOString().slice(0, 10), effective_to: '' };
const emptyOvertime = { department_id: '', title: '', work_date: new Date().toISOString().slice(0, 10), start_time: '', end_time: '', slots_needed: 1, note: '' };

export default function ManagerScheduling() {
    const [tab, setTab] = useState('shifts');
    return <div className="scheduling-workspace">
        <div className="attendance-tabs scheduling-tabs">
            <button className={tab === 'shifts' ? 'attendance-tab active' : 'attendance-tab'} onClick={() => setTab('shifts')}><CalendarClock size={17} /> Ca làm việc</button>
            <button className={tab === 'department' ? 'attendance-tab active' : 'attendance-tab'} onClick={() => setTab('department')}><CalendarDays size={17} /> Lịch phòng ban</button>
            <button className={tab === 'overtime' ? 'attendance-tab active' : 'attendance-tab'} onClick={() => setTab('overtime')}><Plus size={17} /> Tăng ca</button>
            <button className={tab === 'roster' ? 'attendance-tab active' : 'attendance-tab'} onClick={() => setTab('roster')}><Users size={17} /> Nhân viên theo ca</button>
        </div>
        {tab === 'shifts' && <ShiftsTab />}
        {tab === 'department' && <DepartmentScheduleTab />}
        {tab === 'overtime' && <OvertimeTab />}
        {tab === 'roster' && <RosterTab />}
    </div>;
}

function ShiftsTab() {
    const [shifts, setShifts] = useState([]); const [form, setForm] = useState(emptyShift); const [open, setOpen] = useState(false); const [error, setError] = useState('');
    const load = () => api.get('/attendance/shifts').then(({ data }) => setShifts(data)).catch((e) => setError(e.response?.data?.error || 'Không thể tải ca làm việc.'));
    useEffect(() => { load(); }, []);
    const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const submit = async (event) => { event.preventDefault(); try { await api.post('/attendance/shifts', { ...form, break_minutes: Number(form.break_minutes) }); setForm(emptyShift); setOpen(false); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể tạo ca.'); } };
    const deactivate = async (id) => { if (!window.confirm('Ngừng sử dụng ca này?')) return; try { await api.delete(`/attendance/shifts/${id}`); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể ngừng ca.'); } };
    return <DataPanel title="Danh mục ca làm việc" error={error} action={<button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus size={17} /> Thêm ca</button>}>
        {open && <Form className="inline-form" onSubmit={submit}><Field label="Mã ca *" name="code" value={form.code} onChange={update} required /><Field label="Tên ca *" name="name" value={form.name} onChange={update} required /><Field label="Bắt đầu" name="start_time" type="time" value={form.start_time} onChange={update} required /><Field label="Kết thúc" name="end_time" type="time" value={form.end_time} onChange={update} required /><Field label="Nghỉ giữa ca" name="break_minutes" type="number" value={form.break_minutes} onChange={update} /><FormActions onCancel={() => setOpen(false)} /></Form>}
        <table className="data-table"><thead><tr><th>Mã</th><th>Tên ca</th><th>Thời gian</th><th>Nghỉ</th><th>Trạng thái</th><th /></tr></thead><tbody>{!shifts.length ? <Empty colSpan="6" /> : shifts.map((shift) => <tr key={shift.id}><td>{shift.code}</td><td><strong>{shift.name}</strong></td><td>{shift.start_time?.slice(0, 5)} - {shift.end_time?.slice(0, 5)}</td><td>{shift.break_minutes} phút</td><td><span className="badge active">Đang dùng</span></td><td><button className="icon-action" title="Ngừng ca" onClick={() => deactivate(shift.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table>
    </DataPanel>;
}

function DepartmentScheduleTab() {
    const [data, setData] = useState({ schedules: [], departments: [] }); const [shifts, setShifts] = useState([]); const [form, setForm] = useState(emptySchedule); const [open, setOpen] = useState(false); const [error, setError] = useState('');
    const load = async () => { try { const [{ data: scheduleData }, { data: shiftData }] = await Promise.all([api.get('/attendance/department-schedules'), api.get('/attendance/shifts')]); setData(scheduleData); setShifts(shiftData); } catch (e) { setError(e.response?.data?.error || 'Không thể tải lịch phòng ban.'); } };
    useEffect(() => { load(); }, []);
    const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const submit = async (event) => { event.preventDefault(); try { await api.post('/attendance/department-schedules', form); setForm(emptySchedule); setOpen(false); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể lưu lịch phòng ban.'); } };
    const remove = async (id) => { if (!window.confirm('Xóa lịch mặc định này?')) return; try { await api.delete(`/attendance/department-schedules/${id}`); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể xóa lịch.'); } };
    return <DataPanel title="Lịch mặc định theo phòng ban" error={error} action={<button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus size={17} /> Gán lịch</button>}>
        {open && <Form className="inline-form" onSubmit={submit}><SelectField label="Phòng ban" name="department_id" value={form.department_id} onChange={update} options={data.departments.map((item) => [item.id, item.name])} required /><SelectField label="Ca làm việc" name="shift_id" value={form.shift_id} onChange={update} options={shifts.map((item) => [item.id, `${item.name} (${item.start_time?.slice(0, 5)} - ${item.end_time?.slice(0, 5)})`])} required /><SelectField label="Thứ" name="weekday" value={form.weekday} onChange={update} options={weekdays.map((item, index) => [index + 1, item])} /><Field label="Hiệu lực từ" name="effective_from" type="date" value={form.effective_from} onChange={update} required /><Field label="Hiệu lực đến" name="effective_to" type="date" value={form.effective_to} onChange={update} /><FormActions onCancel={() => setOpen(false)} /></Form>}
        <table className="data-table"><thead><tr><th>Phòng ban</th><th>Thứ</th><th>Ca</th><th>Hiệu lực</th><th /></tr></thead><tbody>{!data.schedules.length ? <Empty colSpan="5" /> : data.schedules.map((item) => <tr key={item.id}><td>{item.departments?.name || '-'}</td><td>{weekdays[item.weekday - 1]}</td><td>{item.work_shifts?.name} ({item.work_shifts?.start_time?.slice(0, 5)} - {item.work_shifts?.end_time?.slice(0, 5)})</td><td>{item.effective_from} {item.effective_to ? `- ${item.effective_to}` : '- nay'}</td><td><button className="icon-action" title="Xóa lịch" onClick={() => remove(item.id)}><Trash2 size={16} /></button></td></tr>)}</tbody></table>
    </DataPanel>;
}

function OvertimeTab() {
    const [shifts, setShifts] = useState([]); const [departments, setDepartments] = useState([]); const [form, setForm] = useState(emptyOvertime); const [open, setOpen] = useState(false); const [selectedShift, setSelectedShift] = useState(null); const [registrations, setRegistrations] = useState([]); const [error, setError] = useState('');
    const load = async () => { try { const [{ data: overtime }, { data: options }] = await Promise.all([api.get('/attendance/overtime'), api.get('/attendance/rules/options')]); setShifts(overtime); setDepartments(options.departments || []); } catch (e) { setError(e.response?.data?.error || 'Không thể tải lịch tăng ca.'); } };
    useEffect(() => { load(); }, []);
    const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    const submit = async (event) => { event.preventDefault(); try { await api.post('/attendance/overtime', { ...form, slots_needed: Number(form.slots_needed) }); setForm(emptyOvertime); setOpen(false); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể mở slot tăng ca.'); } };
    const updateStatus = async (id, status) => { try { await api.put(`/attendance/overtime/${id}/status`, { status }); load(); } catch (e) { setError(e.response?.data?.error || 'Không thể cập nhật slot.'); } };
    const showRegistrations = async (shift) => { try { const { data } = await api.get(`/attendance/overtime/${shift.id}/registrations`); setSelectedShift(shift); setRegistrations(data); } catch (e) { setError(e.response?.data?.error || 'Không thể tải danh sách đăng ký.'); } };
    return <DataPanel title="Slot tăng ca" error={error} action={<button className="btn btn-primary" onClick={() => setOpen(!open)}><Plus size={17} /> Mở slot</button>}>
        {open && <Form className="inline-form" onSubmit={submit}><SelectField label="Phòng ban" name="department_id" value={form.department_id} onChange={update} options={departments.map((item) => [item.id, item.name])} /><Field label="Tiêu đề" name="title" value={form.title} onChange={update} /><Field label="Ngày làm" name="work_date" type="date" value={form.work_date} onChange={update} required /><Field label="Bắt đầu" name="start_time" type="datetime-local" value={form.start_time} onChange={update} required /><Field label="Kết thúc" name="end_time" type="datetime-local" value={form.end_time} onChange={update} required /><Field label="Số người" name="slots_needed" type="number" min="1" value={form.slots_needed} onChange={update} required /><Field label="Ghi chú" name="note" value={form.note} onChange={update} /><FormActions onCancel={() => setOpen(false)} /></Form>}
        <table className="data-table"><thead><tr><th>Ngày</th><th>Tiêu đề</th><th>Thời gian</th><th>Đăng ký</th><th>Trạng thái</th><th /></tr></thead><tbody>{!shifts.length ? <Empty colSpan="6" /> : shifts.map((item) => <tr key={item.id}><td>{item.work_date}</td><td>{item.title || 'Tăng ca'}</td><td>{new Date(item.start_time).toLocaleString('vi-VN')} - {new Date(item.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td><td><button className="btn btn-outline btn-sm" onClick={() => showRegistrations(item)}>{item.slots_filled}/{item.slots_needed}</button></td><td><span className={`badge ${item.status === 'open' ? 'active' : 'absent'}`}>{item.status}</span></td><td>{item.status === 'open' ? <button className="btn btn-outline btn-sm" onClick={() => updateStatus(item.id, 'closed')}>Đóng slot</button> : item.status === 'closed' ? <button className="btn btn-outline btn-sm" onClick={() => updateStatus(item.id, 'open')}>Mở lại</button> : null}</td></tr>)}</tbody></table>
        {selectedShift && <div className="registration-panel"><div className="panel-heading"><h3>Đăng ký: {selectedShift.title || 'Tăng ca'} ({selectedShift.work_date})</h3><button className="icon-action" onClick={() => setSelectedShift(null)}><X size={16} /></button></div>{registrations.length ? <table className="data-table"><thead><tr><th>Nhân viên</th><th>Đăng ký lúc</th><th>Trạng thái</th><th>Đối chiếu</th></tr></thead><tbody>{registrations.map((registration) => <tr key={registration.id}><td>{registration.employees?.full_name || '-'}</td><td>{new Date(registration.registered_at).toLocaleString('vi-VN')}</td><td>{registration.status}</td><td>{registration.attendance_status}</td></tr>)}</tbody></table> : <div className="table-message">Chưa có đăng ký.</div>}</div>}
    </DataPanel>;
}

function RosterTab() {
    const today = new Date().toISOString().slice(0, 10);
    const [from, setFrom] = useState(today);
    const [to, setTo] = useState(today);
    const [departmentId, setDepartmentId] = useState('');
    const [departments, setDepartments] = useState([]);
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');
    const load = async () => {
        try {
            const [{ data: roster }, { data: options }] = await Promise.all([
                api.get('/attendance/scheduled-shifts', { params: { from, to, department_id: departmentId || undefined } }),
                api.get('/attendance/rules/options')
            ]);
            setRows(roster);
            setDepartments(options.departments || []);
            setError('');
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Không thể tải danh sách nhân viên theo ca.');
        }
    };
    useEffect(() => { load(); }, [from, to, departmentId]);
    return <DataPanel title="Nhân viên theo ca và phòng ban" error={error}>
        <div className="attendance-range-filter roster-filters">
            <label className="date-filter-field"><span>Từ ngày</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label className="date-filter-field"><span>Đến ngày</span><input type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <label className="date-filter-field"><span>Phòng ban</span><select className="form-input" value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">Tất cả phòng ban</option>{departments.map((department) => <option value={department.id} key={department.id}>{department.name}</option>)}</select></label>
        </div>
        <table className="data-table"><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Phòng ban</th><th>Ca</th><th>Check-in</th><th>Check-out</th><th>Giờ làm</th><th>Tăng ca</th><th>Trạng thái</th><th>Xác nhận</th></tr></thead><tbody>{!rows.length ? <Empty colSpan="10" /> : rows.map((row) => <tr key={row.id}><td>{row.work_date}</td><td><strong>{row.employees?.full_name || '-'}</strong><small className="roster-code">{row.employees?.employee_code || ''}</small></td><td>{row.employees?.departments?.name || '-'}</td><td>{row.work_shifts ? `${row.work_shifts.name} (${row.work_shifts.start_time?.slice(0, 5)} - ${row.work_shifts.end_time?.slice(0, 5)})` : 'Nghỉ'}</td><td>{formatAttendanceTime(row.check_in_time)}</td><td>{formatAttendanceTime(row.check_out_time)}</td><td>{row.work_hours || 0} giờ</td><td>{row.overtime_hours || 0} giờ</td><td>{row.status}</td><td>{row.confirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</td></tr>)}</tbody></table>
    </DataPanel>;
}

function DataPanel({ title, action, error, children }) { return <div className="glass-panel attendance-panel"><div className="panel-heading"><h2>{title}</h2>{action}</div>{error && <p className="error-message">{error}</p>}{children}</div>; }
function Form({ children, ...props }) { return <form {...props}>{children}</form>; }
function Field({ label, ...props }) { return <label>{label}<input className="form-input" {...props} /></label>; }
function SelectField({ label, options, ...props }) { return <label>{label}<select className="form-input" {...props}><option value="">Chọn...</option>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></label>; }
function FormActions({ onCancel }) { return <div className="form-actions"><button type="button" className="btn btn-outline" onClick={onCancel}><X size={16} /> Hủy</button><button type="submit" className="btn btn-primary">Lưu</button></div>; }
function Empty({ colSpan }) { return <tr><td colSpan={colSpan} className="table-message">Chưa có dữ liệu.</td></tr>; }
function formatAttendanceTime(value) { return value ? new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '-'; }
