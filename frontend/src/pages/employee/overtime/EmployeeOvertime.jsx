import { useEffect, useState } from 'react';
import { CalendarClock, Check, Clock3, UserPlus, X } from 'lucide-react';
import api from '../../../services/api';
import './EmployeeOvertime.css';

const formatDate = (value) => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
const formatTime = (value) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

export default function EmployeeOvertime() {
    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadShifts = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await api.get('/employee/overtime');
            setShifts(data || []);
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Không thể tải slot tăng ca.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadShifts(); }, []);

    const register = async (shiftId) => {
        try {
            setBusyId(shiftId); setError(''); setMessage('');
            await api.post(`/employee/overtime/${shiftId}/register`);
            setMessage('Đã đăng ký tăng ca thành công.');
            await loadShifts();
        } catch (requestError) {
            const message = requestError.response?.data?.error || 'Không thể đăng ký tăng ca.';
            setError(message);
            if (requestError.response?.status === 409) window.alert(message);
        } finally { setBusyId(''); }
    };

    const cancel = async (registrationId) => {
        if (!window.confirm('Bạn có chắc muốn hủy đăng ký tăng ca này?')) return;
        try {
            setBusyId(registrationId); setError(''); setMessage('');
            await api.delete(`/employee/overtime/${registrationId}/register`);
            setMessage('Đã hủy đăng ký tăng ca.');
            await loadShifts();
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Không thể hủy đăng ký.');
        } finally { setBusyId(''); }
    };

    return <div className="overtime-page">
        <div className="employee-page-heading"><div><div className="overtime-eyebrow"><CalendarClock size={16} /> Cơ hội tăng ca</div><h1>Đăng ký tăng ca</h1><p>Chọn slot phù hợp trước khi đủ người.</p></div></div>
        {error && <div className="overtime-alert error">{error}</div>}
        {message && <div className="overtime-alert success">{message}</div>}
        {loading ? <div className="overtime-empty">Đang tải slot tăng ca...</div> : shifts.length === 0 ? <div className="overtime-empty"><CalendarClock size={30} /><strong>Chưa có slot tăng ca</strong><span>Các slot phù hợp với phòng ban của bạn sẽ xuất hiện tại đây.</span></div> : <div className="overtime-grid">{shifts.map((shift) => { const registration = shift.my_registration; const full = shift.slots_filled >= shift.slots_needed && !registration; return <article className="overtime-card" key={shift.id}><div className="overtime-card-top"><span className={`overtime-status ${registration ? 'registered' : ''}`}>{registration ? 'Đã đăng ký' : 'Đang mở'}</span><strong>{shift.slots_filled}/{shift.slots_needed} người</strong></div><h2>{shift.title || 'Slot tăng ca'}</h2><div className="overtime-detail"><CalendarClock size={17} /><span>{formatDate(shift.work_date)}</span></div><div className="overtime-detail"><Clock3 size={17} /><span>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span></div>{shift.departments?.name && <div className="overtime-department">Phòng ban: {shift.departments.name}</div>}{shift.note && <p className="overtime-note">{shift.note}</p>}{registration ? <button className="overtime-button secondary" disabled={busyId === registration.id} onClick={() => cancel(registration.id)}><X size={17} /> {busyId === registration.id ? 'Đang xử lý...' : 'Hủy đăng ký'}</button> : <button className="overtime-button" disabled={full || busyId === shift.id} onClick={() => register(shift.id)}><UserPlus size={17} /> {full ? 'Đã đủ người' : busyId === shift.id ? 'Đang đăng ký...' : 'Đăng ký slot'}</button>}</article>; })}</div>}
    </div>;
}
