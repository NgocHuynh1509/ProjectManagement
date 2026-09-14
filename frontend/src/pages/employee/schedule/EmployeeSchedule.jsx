import { useEffect, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import api from '../../../services/api';
import './EmployeeSchedule.css';

const weekdayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

const getMonday = (date) => {
    const result = new Date(`${date}T00:00:00`);
    const day = result.getDay();
    result.setDate(result.getDate() + (day === 0 ? -6 : 1 - day));
    return result.toISOString().slice(0, 10);
};

const addDays = (date, days) => {
    const result = new Date(`${date}T00:00:00`);
    result.setDate(result.getDate() + days);
    return result.toISOString().slice(0, 10);
};

const formatDate = (date) => new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit'
}).format(new Date(`${date}T00:00:00`));

const formatTime = (time) => time?.slice(0, 5) || '';

export default function EmployeeSchedule() {
    const [weekStart, setWeekStart] = useState(() => getMonday(addDays(new Date().toISOString().slice(0, 10), 7)));
    const [schedule, setSchedule] = useState(null);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const loadSchedule = async () => {
        try {
            setLoading(true);
            setError('');
            setMessage('');
            const { data } = await api.get('/employee/schedule', { params: { week_start: weekStart } });
            setSchedule(data);
            setEntries(data.days.map((day) => ({
                work_date: day.work_date,
                shift_id: day.shift?.id || '',
                note: day.note || ''
            })));
        } catch (requestError) {
            setError(requestError.response?.data?.error || 'Không thể tải lịch làm việc.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSchedule();
    }, [weekStart]);

    const updateEntry = (index, field, value) => {
        setEntries((current) => current.map((entry, entryIndex) => (
            entryIndex === index ? { ...entry, [field]: value } : entry
        )));
    };

    const saveSchedule = async (event) => {
        event.preventDefault();
        try {
            setSaving(true);
            setError('');
            const { data } = await api.put('/employee/schedule', {
                week_start: weekStart,
                entries
            });
            setSchedule(data);
            setMessage('Đã lưu lịch làm việc. Bạn vẫn có thể chỉnh sửa trước thời hạn 1 tuần.');
        } catch (requestError) {
            const message = requestError.response?.data?.error || 'Không thể lưu lịch làm việc.';
            setError(message);
            if (requestError.response?.status === 409) window.alert(message);
        } finally {
            setSaving(false);
        }
    };

    const confirmSchedule = async () => {
        if (!window.confirm('Sau khi xác nhận, bạn không thể chỉnh sửa ca trong tuần này. Tiếp tục?')) return;
        try {
            setSaving(true);
            setError('');
            const { data } = await api.post('/employee/schedule/confirm', { week_start: weekStart });
            setSchedule(data);
            setMessage('Đã xác nhận lịch. Nếu cần nghỉ, hãy gửi yêu cầu nghỉ phép.');
        } catch (requestError) {
            const message = requestError.response?.data?.error || 'Không thể xác nhận lịch.';
            setError(message);
            if (requestError.response?.status === 409) window.alert(message);
        } finally {
            setSaving(false);
        }
    };

    const changeWeek = (amount) => setWeekStart((current) => addDays(current, amount * 7));
    const canEdit = Boolean(schedule?.can_edit);

    return (
        <div className="schedule-page">
            <div className="schedule-heading">
                <div>
                    <div className="schedule-eyebrow"><CalendarDays size={16} /> Lịch làm việc</div>
                    <h1>Xếp lịch tuần</h1>
                    <p>Chọn ca làm hoặc đăng ký nghỉ cho tuần kế tiếp.</p>
                </div>
                <div className="schedule-week-controls">
                    <button type="button" onClick={() => changeWeek(-1)} aria-label="Tuần trước"><ChevronLeft size={18} /></button>
                    <strong>{formatDate(weekStart)} - {formatDate(addDays(weekStart, 6))}</strong>
                    <button type="button" onClick={() => changeWeek(1)} aria-label="Tuần sau"><ChevronRight size={18} /></button>
                </div>
            </div>

            {error && <div className="schedule-alert error">{error}</div>}
            {message && <div className="schedule-alert success">{message}</div>}

            {loading ? <div className="schedule-empty">Đang tải lịch...</div> : (
                <form onSubmit={saveSchedule}>
                    <div className="schedule-notice">
                        <span>{schedule?.is_confirmed ? 'Lịch đã xác nhận. Nếu cần nghỉ, hãy gửi yêu cầu nghỉ phép.' : canEdit ? 'Bạn chỉ có thể đăng ký và xác nhận lịch tuần kế tiếp.' : 'Chỉ được đăng ký và xác nhận lịch tuần kế tiếp.'}</span>
                        <span className="schedule-department">Lịch mặc định theo phòng ban</span>
                    </div>

                    <div className="schedule-list">
                        {schedule.days.map((day, index) => {
                            const entry = entries[index];
                            const isOff = !entry?.shift_id;
                            return (
                                <article className={`schedule-day ${isOff ? 'is-off' : ''}`} key={day.work_date}>
                                    <div className="schedule-day-date">
                                        <strong>{weekdayLabels[index]}</strong>
                                        <span>{formatDate(day.work_date)}</span>
                                    </div>
                                    <div className="schedule-day-default">
                                        <small>Mặc định</small>
                                        <span>{day.default_shift ? `${day.default_shift.name} (${formatTime(day.default_shift.start_time)} - ${formatTime(day.default_shift.end_time)})` : 'Chưa có ca'}</span>
                                    </div>
                                    <label className="schedule-select-label">
                                        <span>Ca đăng ký</span>
                                        <select disabled={!canEdit} value={entry?.shift_id || ''} onChange={(event) => updateEntry(index, 'shift_id', event.target.value)}>
                                            <option value="">Nghỉ / không làm</option>
                                            {schedule.shifts.map((shift) => <option value={shift.id} key={shift.id}>{shift.name} ({formatTime(shift.start_time)} - {formatTime(shift.end_time)})</option>)}
                                        </select>
                                    </label>
                                    <label className="schedule-note-label">
                                        <span>Ghi chú</span>
                                        <input disabled={!canEdit} value={entry?.note || ''} onChange={(event) => updateEntry(index, 'note', event.target.value)} placeholder="Không bắt buộc" />
                                    </label>
                                </article>
                            );
                        })}
                    </div>

                    {canEdit && <div className="schedule-actions"><button className="schedule-save" type="submit" disabled={saving}><Save size={17} /> {saving ? 'Đang lưu...' : 'Lưu lịch'}</button><button className="schedule-confirm" type="button" onClick={confirmSchedule} disabled={saving}><Check size={17} /> Xác nhận lịch</button></div>}
                </form>
            )}
        </div>
    );
}
