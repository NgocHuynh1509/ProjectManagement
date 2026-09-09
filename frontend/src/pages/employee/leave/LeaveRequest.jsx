import { useEffect, useState } from 'react';
import api from '../../../services/api';
import './LeaveRequest.css';

const LeaveRequest = () => {

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    const [form, setForm] = useState({
        leave_type: 'annual',
        start_date: '',
        end_date: '',
        reason: ''
    });


    const fetchRequests = async () => {

        try {

            const response =
                await api.get('/employee/leave');

            setRequests(response.data || []);

        } catch (error) {

            console.error(error);

        } finally {

            setLoading(false);

        }
    };


    useEffect(() => {
        fetchRequests();
    }, []);


    const handleChange = e => {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    };


    const submitRequest = async e => {

        e.preventDefault();

        try {

            setSending(true);

            await api.post(
                '/employee/leave',
                form
            );

            setForm({
                leave_type: 'annual',
                start_date: '',
                end_date: '',
                reason: ''
            });

            await fetchRequests();

            alert('Đã gửi yêu cầu nghỉ phép.');

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể gửi yêu cầu.'
            );

        } finally {

            setSending(false);

        }
    };


    const cancelRequest = async id => {

        if (
            !window.confirm(
                'Bạn có chắc muốn hủy yêu cầu này?'
            )
        ) {
            return;
        }

        try {

            await api.delete(
                `/employee/leave/${id}`
            );

            await fetchRequests();

        } catch (error) {

            alert(
                error.response?.data?.error ||
                'Không thể hủy yêu cầu.'
            );

        }
    };


    return (
        <div className="leave-page">

            <div className="employee-page-heading">

                <h1>Nghỉ phép</h1>

                <p>
                    Gửi và theo dõi yêu cầu nghỉ phép
                </p>

            </div>


            <div className="leave-grid">

                {/* FORM */}

                <section className="leave-card">

                    <h2>Tạo yêu cầu nghỉ phép</h2>

                    <form onSubmit={submitRequest}>

                        <div className="leave-form-group">

                            <label>
                                Loại nghỉ
                            </label>

                            <select
                                name="leave_type"
                                value={form.leave_type}
                                onChange={handleChange}
                            >

                                <option value="annual">
                                    Nghỉ phép năm
                                </option>

                                <option value="sick">
                                    Nghỉ ốm
                                </option>

                                <option value="unpaid">
                                    Nghỉ không lương
                                </option>

                                <option value="personal">
                                    Nghỉ việc riêng
                                </option>

                            </select>

                        </div>


                        <div className="leave-date-grid">

                            <div className="leave-form-group">

                                <label>
                                    Từ ngày
                                </label>

                                <input
                                    type="date"
                                    name="start_date"
                                    value={form.start_date}
                                    onChange={handleChange}
                                    required
                                />

                            </div>


                            <div className="leave-form-group">

                                <label>
                                    Đến ngày
                                </label>

                                <input
                                    type="date"
                                    name="end_date"
                                    value={form.end_date}
                                    onChange={handleChange}
                                    required
                                />

                            </div>

                        </div>


                        <div className="leave-form-group">

                            <label>
                                Lý do
                            </label>

                            <textarea
                                name="reason"
                                value={form.reason}
                                onChange={handleChange}
                                rows="4"
                                placeholder="Nhập lý do nghỉ..."
                            />

                        </div>


                        <button
                            type="submit"
                            disabled={sending}
                        >
                            {sending
                                ? 'Đang gửi...'
                                : 'Gửi yêu cầu'}
                        </button>

                    </form>

                </section>


                {/* HISTORY */}

                <section className="leave-card">

                    <h2>Lịch sử yêu cầu</h2>

                    {loading ? (

                        <div className="leave-empty">
                            Đang tải...
                        </div>

                    ) : requests.length ? (

                        <div className="leave-list">

                            {requests.map(item => (

                                <div
                                    className="leave-item"
                                    key={item.id}
                                >

                                    <div>

                                        <strong>
                                            {item.leave_type}
                                        </strong>

                                        <p>
                                            {item.start_date}
                                            {' → '}
                                            {item.end_date}
                                        </p>

                                        <small>
                                            {item.reason ||
                                                'Không có lý do'}
                                        </small>

                                    </div>

                                    <div className="leave-item-right">

                                        <span
                                            className={`leave-status ${item.status}`}
                                        >
                                            {item.status}
                                        </span>

                                        {item.status === 'pending' && (

                                            <button
                                                onClick={() =>
                                                    cancelRequest(
                                                        item.id
                                                    )
                                                }
                                            >
                                                Hủy
                                            </button>

                                        )}

                                    </div>

                                </div>

                            ))}

                        </div>

                    ) : (

                        <div className="leave-empty">
                            Chưa có yêu cầu nghỉ phép.
                        </div>

                    )}

                </section>

            </div>

        </div>
    );
};

export default LeaveRequest;