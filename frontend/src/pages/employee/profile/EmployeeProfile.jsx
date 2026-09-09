import { useEffect, useState } from 'react';
import api from '../../../services/api';
import './EmployeeProfile.css';

const EmployeeProfile = () => {

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        phone: '',
        address: '',
        avatar_url: ''
    });

    useEffect(() => {

        const loadProfile = async () => {

            try {

                const response =
                    await api.get('/employee/profile');

                setProfile(response.data);

                setForm({
                    phone: response.data.phone || '',
                    address: response.data.address || '',
                    avatar_url: response.data.avatar_url || ''
                });

            } catch (err) {

                setError(
                    err.response?.data?.error ||
                    'Không thể tải hồ sơ.'
                );

            } finally {

                setLoading(false);

            }
        };

        loadProfile();

    }, []);


    const handleChange = (e) => {

        setForm({
            ...form,
            [e.target.name]: e.target.value
        });

    };


    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);
            setMessage('');
            setError('');

            const response = await api.put(
                '/employee/profile',
                form
            );

            setProfile({
                ...profile,
                ...response.data.employee
            });

            setMessage('Cập nhật hồ sơ thành công.');

        } catch (err) {

            setError(
                err.response?.data?.error ||
                'Không thể cập nhật hồ sơ.'
            );

        } finally {

            setSaving(false);

        }
    };


    if (loading) {
        return (
            <div className="employee-page-loading">
                Đang tải hồ sơ...
            </div>
        );
    }


    if (!profile) {
        return (
            <div className="employee-page-error">
                {error || 'Không tìm thấy hồ sơ.'}
            </div>
        );
    }


    return (
        <div className="employee-profile-page">

            <div className="employee-page-heading">
                <div>
                    <h1>Hồ sơ của tôi</h1>
                    <p>
                        Xem và cập nhật thông tin cá nhân
                    </p>
                </div>
            </div>


            {message && (
                <div className="profile-success">
                    ✓ {message}
                </div>
            )}

            {error && (
                <div className="profile-error">
                    {error}
                </div>
            )}


            <div className="profile-grid">

                {/* BASIC INFO */}

                <section className="profile-card">

                    <h2>Thông tin nhân viên</h2>

                    <div className="profile-avatar-large">

                        {profile.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name}
                            />
                        ) : (
                            profile.full_name
                                ?.charAt(0)
                                ?.toUpperCase()
                        )}

                    </div>

                    <div className="profile-info-list">

                        <div>
                            <span>Mã nhân viên</span>
                            <strong>
                                {profile.employee_code || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Họ và tên</span>
                            <strong>
                                {profile.full_name}
                            </strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>
                                {profile.email}
                            </strong>
                        </div>

                        <div>
                            <span>Phòng ban</span>
                            <strong>
                                {profile.departments?.name || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Chức vụ</span>
                            <strong>
                                {profile.positions?.name || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Ngày vào làm</span>
                            <strong>
                                {profile.hire_date || '--'}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* EDIT */}

                <section className="profile-card">

                    <h2>Thông tin có thể cập nhật</h2>

                    <form onSubmit={handleSubmit}>

                        <div className="form-group">

                            <label>
                                Số điện thoại
                            </label>

                            <input
                                type="text"
                                name="phone"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="Nhập số điện thoại"
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Địa chỉ
                            </label>

                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Nhập địa chỉ"
                                rows="4"
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Avatar URL
                            </label>

                            <input
                                type="text"
                                name="avatar_url"
                                value={form.avatar_url}
                                onChange={handleChange}
                                placeholder="https://..."
                            />

                        </div>


                        <button
                            type="submit"
                            className="profile-save-btn"
                            disabled={saving}
                        >
                            {saving
                                ? 'Đang lưu...'
                                : 'Lưu thay đổi'}
                        </button>

                    </form>

                </section>

            </div>

        </div>
    );
};

export default EmployeeProfile;