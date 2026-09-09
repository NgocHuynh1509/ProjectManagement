import { useEffect, useState } from 'react';
import api from '../../../services/api';
import './MyAttendance.css';

const MyAttendance = () => {

    const today = new Date();

    const [month, setMonth] =
        useState(today.getMonth() + 1);

    const [year, setYear] =
        useState(today.getFullYear());

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        const fetchAttendance = async () => {

            try {

                setLoading(true);

                const response = await api.get(
                    '/employee/attendance',
                    {
                        params: {
                            month,
                            year
                        }
                    }
                );

                setData(response.data);

            } catch (error) {

                console.error(error);

            } finally {

                setLoading(false);

            }
        };

        fetchAttendance();

    }, [month, year]);


    return (
        <div className="attendance-page">

            <div className="employee-page-heading">

                <div>
                    <h1>Chấm công của tôi</h1>
                    <p>
                        Theo dõi lịch sử chấm công và thời gian làm việc
                    </p>
                </div>

                <div className="attendance-filter">

                    <select
                        value={month}
                        onChange={e =>
                            setMonth(Number(e.target.value))
                        }
                    >
                        {Array.from(
                            { length: 12 },
                            (_, index) => (
                                <option
                                    key={index + 1}
                                    value={index + 1}
                                >
                                    Tháng {index + 1}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={year}
                        onChange={e =>
                            setYear(Number(e.target.value))
                        }
                    >
                        <option value={2025}>2025</option>
                        <option value={2026}>2026</option>
                        <option value={2027}>2027</option>
                    </select>

                </div>

            </div>


            {loading ? (

                <div className="attendance-loading">
                    Đang tải dữ liệu...
                </div>

            ) : (

                <>

                    {/* STATISTICS */}

                    <div className="attendance-stat-grid">

                        <div className="attendance-stat">
                            <span>📅</span>
                            <strong>
                                {data?.statistics?.totalDays || 0}
                            </strong>
                            <p>Ngày có dữ liệu</p>
                        </div>

                        <div className="attendance-stat">
                            <span>✅</span>
                            <strong>
                                {data?.statistics?.presentDays || 0}
                            </strong>
                            <p>Ngày đi làm</p>
                        </div>

                        <div className="attendance-stat">
                            <span>⏰</span>
                            <strong>
                                {data?.statistics?.lateDays || 0}
                            </strong>
                            <p>Ngày đi trễ</p>
                        </div>

                        <div className="attendance-stat">
                            <span>⌛</span>
                            <strong>
                                {data?.statistics?.totalOvertimeHours || 0}h
                            </strong>
                            <p>Tăng ca</p>
                        </div>

                    </div>


                    {/* TABLE */}

                    <div className="attendance-card">

                        <div className="attendance-card-header">

                            <h2>
                                Lịch sử chấm công
                            </h2>

                        </div>

                        <div className="attendance-table-wrapper">

                            <table>

                                <thead>

                                    <tr>
                                        <th>Ngày</th>
                                        <th>Check-in</th>
                                        <th>Check-out</th>
                                        <th>Giờ làm</th>
                                        <th>Đi trễ</th>
                                        <th>Về sớm</th>
                                        <th>OT</th>
                                        <th>Trạng thái</th>
                                    </tr>

                                </thead>

                                <tbody>

                                    {data?.records?.length ? (

                                        data.records.map(record => (

                                            <tr key={record.id}>

                                                <td>
                                                    {record.work_date}
                                                </td>

                                                <td>
                                                    {record.check_in_time
                                                        ? new Date(
                                                            record.check_in_time
                                                        ).toLocaleTimeString(
                                                            'vi-VN'
                                                        )
                                                        : '--'}
                                                </td>

                                                <td>
                                                    {record.check_out_time
                                                        ? new Date(
                                                            record.check_out_time
                                                        ).toLocaleTimeString(
                                                            'vi-VN'
                                                        )
                                                        : '--'}
                                                </td>

                                                <td>
                                                    {record.work_hours || 0}h
                                                </td>

                                                <td>
                                                    {record.late_minutes || 0} phút
                                                </td>

                                                <td>
                                                    {record.early_leave_minutes || 0} phút
                                                </td>

                                                <td>
                                                    {record.overtime_hours || 0}h
                                                </td>

                                                <td>

                                                    <span
                                                        className={`attendance-status ${record.status}`}
                                                    >
                                                        {record.status}
                                                    </span>

                                                </td>

                                            </tr>

                                        ))

                                    ) : (

                                        <tr>

                                            <td
                                                colSpan="8"
                                                className="attendance-empty"
                                            >
                                                Chưa có dữ liệu chấm công.
                                            </td>

                                        </tr>

                                    )}

                                </tbody>

                            </table>

                        </div>

                    </div>

                </>

            )}

        </div>
    );
};

export default MyAttendance;