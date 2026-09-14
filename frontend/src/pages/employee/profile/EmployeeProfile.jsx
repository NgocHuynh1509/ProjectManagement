import { useEffect, useState } from 'react';
import api from '../../../services/api';
import './EmployeeProfile.css';

const emptyQualification = {
    degree_name: '',
    school: '',
    major: '',
    graduation_year: '',
    degree_type: ''
};

const emptyCertificate = {
    name: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
    credential_url: ''
};

const emptyExperience = {
    company_name: '',
    position: '',
    start_date: '',
    end_date: '',
    description: ''
};

const EmployeeProfile = () => {

    const [profile, setProfile] = useState(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // ============================================================
    // BASIC INFO
    // ============================================================

    const [form, setForm] = useState({
        phone: '',
        address: '',
        avatar_url: ''
    });

    // ============================================================
    // QUALIFICATIONS
    // ============================================================

    const [qualifications, setQualifications] = useState([]);
    const [qualificationForm, setQualificationForm] = useState(
        emptyQualification
    );
    const [editingQualificationId, setEditingQualificationId] =
        useState(null);
    const [showQualificationForm, setShowQualificationForm] =
        useState(false);

    // ============================================================
    // CERTIFICATES
    // ============================================================

    const [certificates, setCertificates] = useState([]);
    const [certificateForm, setCertificateForm] = useState(
        emptyCertificate
    );
    const [editingCertificateId, setEditingCertificateId] =
        useState(null);
    const [showCertificateForm, setShowCertificateForm] =
        useState(false);

    // ============================================================
    // EXPERIENCE
    // ============================================================

    const [experiences, setExperiences] = useState([]);
    const [experienceForm, setExperienceForm] = useState(
        emptyExperience
    );
    const [editingExperienceId, setEditingExperienceId] =
        useState(null);
    const [showExperienceForm, setShowExperienceForm] =
        useState(false);

    // ============================================================
    const loadProfile = async () => {

        try {

            setLoading(true);
            setError('');

            const response =
                await api.get('/employee/profile');

            const data = response.data;

            setProfile(data);

            setForm({
                phone: data.phone || '',
                address: data.address || '',
                avatar_url: data.avatar_url || ''
            });

            setQualifications(
                data.qualifications || []
            );

            setCertificates(
                data.certificates || []
            );

            setExperiences(
                data.experience || []
            );

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.error ||
                'Không thể tải hồ sơ.'
            );

        } finally {

            setLoading(false);

        }
    };

    // ============================================================
    // LOAD PROFILE
    // ============================================================

    useEffect(() => {

        loadProfile();

    }, []);

    // ============================================================
    // BASIC INFO
    // ============================================================

    const handleChange = (e) => {

        const { name, value } = e.target;

        setForm(prev => ({
            ...prev,
            [name]: value
        }));

    };

    const handleSaveProfile = async (e) => {

        e.preventDefault();

        try {

            setSaving(true);
            setMessage('');
            setError('');

            const response = await api.put(
                '/employee/profile',
                form
            );

            setProfile(prev => ({
                ...prev,
                ...response.data.employee
            }));

            setMessage(
                'Cập nhật thông tin cá nhân thành công.'
            );

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.error ||
                'Không thể cập nhật thông tin.'
            );

        } finally {

            setSaving(false);

        }
    };

    // ============================================================
    // QUALIFICATION FORM
    // ============================================================

    const handleQualificationChange = (e) => {

        const { name, value } = e.target;

        setQualificationForm(prev => ({
            ...prev,
            [name]: value
        }));

    };

    const resetQualificationForm = () => {

        setQualificationForm({
            ...emptyQualification
        });

        setEditingQualificationId(null);
        setShowQualificationForm(false);

    };

    const editQualification = (item) => {

        setEditingQualificationId(item.id);
        setShowQualificationForm(true);

        setQualificationForm({
            degree_name: item.degree_name || '',
            school: item.school || '',
            major: item.major || '',
            graduation_year:
                item.graduation_year || '',
            degree_type:
                item.degree_type || ''
        });

        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });

    };

    const saveQualification = async (e) => {

        e.preventDefault();

        try {

            setError('');
            setMessage('');

            if (!qualificationForm.degree_name.trim()) {

                setError('Vui lòng nhập tên bằng cấp.');

                return;
            }

            if (editingQualificationId) {

                await api.put(
                    `/employee/profile/qualifications/${editingQualificationId}`,
                    qualificationForm
                );

            } else {

                await api.post(
                    '/employee/profile/qualifications',
                    qualificationForm
                );

            }

            setMessage(
                editingQualificationId
                    ? 'Đã cập nhật bằng cấp.'
                    : 'Đã thêm bằng cấp.'
            );

            resetQualificationForm();

            await loadProfile();

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.error ||
                'Không thể lưu bằng cấp.'
            );

        }

    };

    const deleteQualification = async (id) => {

        if (!window.confirm(
            'Bạn có chắc muốn xóa bằng cấp này?'
        )) {
            return;
        }

        try {

            await api.delete(
                `/employee/profile/qualifications/${id}`
            );

            setMessage('Đã xóa bằng cấp.');

            await loadProfile();

        } catch (err) {

            setError(
                err.response?.data?.error ||
                'Không thể xóa bằng cấp.'
            );

        }

    };

    // ============================================================
    // CERTIFICATE FORM
    // ============================================================

    const handleCertificateChange = (e) => {

        const { name, value } = e.target;

        setCertificateForm(prev => ({
            ...prev,
            [name]: value
        }));

    };

    const resetCertificateForm = () => {

        setCertificateForm({
            ...emptyCertificate
        });

        setEditingCertificateId(null);
        setShowCertificateForm(false);

    };

    const editCertificate = (item) => {

        setEditingCertificateId(item.id);
        setShowCertificateForm(true);

        setCertificateForm({
            name: item.name || '',
            issuer: item.issuer || '',
            issue_date: item.issue_date || '',
            expiry_date: item.expiry_date || '',
            credential_url:
                item.credential_url || ''
        });

    };

    const saveCertificate = async (e) => {

        e.preventDefault();

        try {

            setError('');
            setMessage('');

            if (!certificateForm.name.trim()) {

                setError('Vui lòng nhập tên chứng chỉ.');

                return;
            }

            if (editingCertificateId) {

                await api.put(
                    `/employee/profile/certificates/${editingCertificateId}`,
                    certificateForm
                );

            } else {

                await api.post(
                    '/employee/profile/certificates',
                    certificateForm
                );

            }

            setMessage(
                editingCertificateId
                    ? 'Đã cập nhật chứng chỉ.'
                    : 'Đã thêm chứng chỉ.'
            );

            resetCertificateForm();

            await loadProfile();

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.error ||
                'Không thể lưu chứng chỉ.'
            );

        }

    };

    const deleteCertificate = async (id) => {

        if (!window.confirm(
            'Bạn có chắc muốn xóa chứng chỉ này?'
        )) {
            return;
        }

        try {

            await api.delete(
                `/employee/profile/certificates/${id}`
            );

            setMessage('Đã xóa chứng chỉ.');

            await loadProfile();

        } catch (err) {

            setError(
                err.response?.data?.error ||
                'Không thể xóa chứng chỉ.'
            );

        }

    };

    // ============================================================
    // EXPERIENCE FORM
    // ============================================================

    const handleExperienceChange = (e) => {

        const { name, value } = e.target;

        setExperienceForm(prev => ({
            ...prev,
            [name]: value
        }));

    };

    const resetExperienceForm = () => {

        setExperienceForm({
            ...emptyExperience
        });

        setEditingExperienceId(null);
        setShowExperienceForm(false);

    };

    const editExperience = (item) => {

        setEditingExperienceId(item.id);
        setShowExperienceForm(true);

        setExperienceForm({
            company_name:
                item.company_name || '',
            position:
                item.position || '',
            start_date:
                item.start_date || '',
            end_date:
                item.end_date || '',
            description:
                item.description || ''
        });

    };

    const saveExperience = async (e) => {

        e.preventDefault();

        try {

            setError('');
            setMessage('');

            if (!experienceForm.company_name.trim()) {

                setError(
                    'Vui lòng nhập tên công ty.'
                );

                return;
            }

            if (editingExperienceId) {

                await api.put(
                    `/employee/profile/experiences/${editingExperienceId}`,
                    experienceForm
                );

            } else {

                await api.post(
                    '/employee/profile/experiences',
                    experienceForm
                );

            }

            setMessage(
                editingExperienceId
                    ? 'Đã cập nhật kinh nghiệm.'
                    : 'Đã thêm kinh nghiệm.'
            );

            resetExperienceForm();

            await loadProfile();

        } catch (err) {

            console.error(err);

            setError(
                err.response?.data?.error ||
                'Không thể lưu kinh nghiệm.'
            );

        }

    };

    const deleteExperience = async (id) => {

        if (!window.confirm(
            'Bạn có chắc muốn xóa kinh nghiệm này?'
        )) {
            return;
        }

        try {

            await api.delete(
                `/employee/profile/experiences/${id}`
            );

            setMessage('Đã xóa kinh nghiệm.');

            await loadProfile();

        } catch (err) {

            setError(
                err.response?.data?.error ||
                'Không thể xóa kinh nghiệm.'
            );

        }

    };

    // ============================================================
    // LOADING
    // ============================================================

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

    // ============================================================
    // UI
    // ============================================================

    return (

        <div className="employee-profile-page">

            {/* ==================================================
                HEADER
            ================================================== */}

            <div className="employee-page-heading">

                <div>

                    <h1>
                        Hồ sơ của tôi
                    </h1>

                    <p>
                        Xem và cập nhật thông tin cá nhân,
                        bằng cấp, chứng chỉ và kinh nghiệm.
                    </p>

                </div>

            </div>


            {/* ==================================================
                MESSAGE
            ================================================== */}

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


            {/* ==================================================
                BASIC INFORMATION
            ================================================== */}

            <div className="profile-grid">

                <section className="profile-card">

                    <h2>
                        Thông tin nhân viên
                    </h2>

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

                        <div>
                            <span>Ngày sinh</span>
                            <strong>
                                {profile.date_of_birth || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Giới tính</span>
                            <strong>
                                {profile.gender || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>CCCD</span>
                            <strong>
                                {profile.national_id || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Ngày cấp CCCD</span>
                            <strong>
                                {profile.national_id_issue_date || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Nơi cấp CCCD</span>
                            <strong>
                                {profile.national_id_issue_place || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Trạng thái</span>
                            <strong>
                                {profile.status || '--'}
                            </strong>
                        </div>

                        <div>
                            <span>Địa chỉ</span>
                            <strong>
                                {profile.address || '--'}
                            </strong>
                        </div>

                    </div>

                </section>


                {/* ==================================================
                    EDIT BASIC INFORMATION
                ================================================== */}

                <section className="profile-card">

                    <h2>
                        Thông tin cá nhân
                    </h2>

                    <form
                        onSubmit={handleSaveProfile}
                    >

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
                                : 'Lưu thông tin'}

                        </button>

                    </form>

                </section>

            </div>


            {/* ==================================================
                QUALIFICATIONS
            ================================================== */}

            <section className="profile-card profile-section">

                <div className="profile-section-header">

                    <div>
                        <h2>
                            🎓 Bằng cấp
                        </h2>

                        <p>
                            Các bằng cấp và trình độ học vấn
                        </p>
                    </div>

                    <button
                        type="button"
                        className="profile-add-btn"
                        onClick={() => {
                            resetQualificationForm();
                            setShowQualificationForm(true);
                        }}
                    >
                        + Thêm bằng cấp
                    </button>

                </div>


                {qualifications.length === 0 ? (

                    <div className="profile-empty">
                        Chưa có bằng cấp nào.
                    </div>

                ) : (

                    <div className="profile-list">

                        {qualifications.map(item => (

                            <div
                                className="profile-list-item"
                                key={item.id}
                            >

                                <div className="profile-list-content">

                                    <h3>
                                        {item.degree_name}
                                    </h3>

                                    <p>
                                        {item.school || '--'}
                                    </p>

                                    <p>
                                        Chuyên ngành:{' '}
                                        {item.major || '--'}
                                    </p>

                                    <p>
                                        Loại bằng:{' '}
                                        {item.degree_type || '--'}
                                    </p>

                                    <p>
                                        Năm tốt nghiệp:{' '}
                                        {item.graduation_year || '--'}
                                    </p>

                                </div>

                                <div className="profile-actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            editQualification(item)
                                        }
                                    >
                                        Sửa
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() =>
                                            deleteQualification(item.id)
                                        }
                                    >
                                        Xóa
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}


                {/* FORM */}

                {showQualificationForm && (
                    <form
                        className="profile-sub-form"
                        onSubmit={saveQualification}
                    >

                    <h3>
                        {editingQualificationId
                            ? 'Chỉnh sửa bằng cấp'
                            : 'Thêm bằng cấp'}
                    </h3>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Tên bằng cấp *
                            </label>

                            <input
                                name="degree_name"
                                value={
                                    qualificationForm.degree_name
                                }
                                onChange={
                                    handleQualificationChange
                                }
                                placeholder="VD: Cử nhân CNTT"
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Loại bằng
                            </label>

                            <input
                                name="degree_type"
                                value={
                                    qualificationForm.degree_type
                                }
                                onChange={
                                    handleQualificationChange
                                }
                                placeholder="Đại học / Thạc sĩ..."
                            />

                        </div>

                    </div>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Trường
                            </label>

                            <input
                                name="school"
                                value={
                                    qualificationForm.school
                                }
                                onChange={
                                    handleQualificationChange
                                }
                                placeholder="Tên trường"
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Chuyên ngành
                            </label>

                            <input
                                name="major"
                                value={
                                    qualificationForm.major
                                }
                                onChange={
                                    handleQualificationChange
                                }
                                placeholder="Công nghệ phần mềm..."
                            />

                        </div>

                    </div>


                    <div className="form-group">

                        <label>
                            Năm tốt nghiệp
                        </label>

                        <input
                            type="number"
                            name="graduation_year"
                            value={
                                qualificationForm.graduation_year
                            }
                            onChange={
                                handleQualificationChange
                            }
                            placeholder="2026"
                        />

                    </div>


                    <div className="profile-form-actions">

                        <button
                            type="submit"
                            className="profile-save-btn"
                        >
                            {editingQualificationId
                                ? 'Cập nhật'
                                : 'Thêm bằng cấp'}
                        </button>

                        {editingQualificationId && (

                            <button
                                type="button"
                                className="profile-cancel-btn"
                                onClick={
                                    resetQualificationForm
                                }
                            >
                                Hủy
                            </button>

                        )}

                    </div>

                    </form>
                )}

            </section>


            {/* ==================================================
                CERTIFICATES
            ================================================== */}

            <section className="profile-card profile-section">

                <div className="profile-section-header">

                    <div>

                        <h2>
                            📜 Chứng chỉ
                        </h2>

                        <p>
                            Các chứng chỉ chuyên môn
                        </p>

                    </div>

                    <button
                        type="button"
                        className="profile-add-btn"
                        onClick={() => {
                            resetCertificateForm();
                            setShowCertificateForm(true);
                        }}
                    >
                        + Thêm chứng chỉ
                    </button>

                </div>


                {certificates.length === 0 ? (

                    <div className="profile-empty">
                        Chưa có chứng chỉ nào.
                    </div>

                ) : (

                    <div className="profile-list">

                        {certificates.map(item => (

                            <div
                                className="profile-list-item"
                                key={item.id}
                            >

                                <div className="profile-list-content">

                                    <h3>
                                        {item.name}
                                    </h3>

                                    <p>
                                        Đơn vị cấp:{' '}
                                        {item.issuer || '--'}
                                    </p>

                                    <p>
                                        Ngày cấp:{' '}
                                        {item.issue_date || '--'}
                                    </p>

                                    <p>
                                        Ngày hết hạn:{' '}
                                        {item.expiry_date || 'Không có'}
                                    </p>

                                    {item.credential_url && (

                                        <a
                                            href={item.credential_url}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Xem chứng chỉ
                                        </a>

                                    )}

                                </div>


                                <div className="profile-actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            editCertificate(item)
                                        }
                                    >
                                        Sửa
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() =>
                                            deleteCertificate(item.id)
                                        }
                                    >
                                        Xóa
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}


                {/* FORM */}

                {showCertificateForm && (
                    <form
                        className="profile-sub-form"
                        onSubmit={saveCertificate}
                    >

                    <h3>
                        {editingCertificateId
                            ? 'Chỉnh sửa chứng chỉ'
                            : 'Thêm chứng chỉ'}
                    </h3>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Tên chứng chỉ *
                            </label>

                            <input
                                name="name"
                                value={
                                    certificateForm.name
                                }
                                onChange={
                                    handleCertificateChange
                                }
                                placeholder="VD: AWS Certified..."
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Đơn vị cấp
                            </label>

                            <input
                                name="issuer"
                                value={
                                    certificateForm.issuer
                                }
                                onChange={
                                    handleCertificateChange
                                }
                                placeholder="AWS / Microsoft / PMI..."
                            />

                        </div>

                    </div>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Ngày cấp
                            </label>

                            <input
                                type="date"
                                name="issue_date"
                                value={
                                    certificateForm.issue_date
                                }
                                onChange={
                                    handleCertificateChange
                                }
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Ngày hết hạn
                            </label>

                            <input
                                type="date"
                                name="expiry_date"
                                value={
                                    certificateForm.expiry_date
                                }
                                onChange={
                                    handleCertificateChange
                                }
                            />

                        </div>

                    </div>


                    <div className="form-group">

                        <label>
                            Link chứng chỉ
                        </label>

                        <input
                            type="text"
                            name="credential_url"
                            value={
                                certificateForm.credential_url
                            }
                            onChange={
                                handleCertificateChange
                            }
                            placeholder="https://..."
                        />

                    </div>


                    <div className="profile-form-actions">

                        <button
                            type="submit"
                            className="profile-save-btn"
                        >
                            {editingCertificateId
                                ? 'Cập nhật'
                                : 'Thêm chứng chỉ'}
                        </button>

                        {editingCertificateId && (

                            <button
                                type="button"
                                className="profile-cancel-btn"
                                onClick={
                                    resetCertificateForm
                                }
                            >
                                Hủy
                            </button>

                        )}

                    </div>

                    </form>
                )}

            </section>


            {/* ==================================================
                WORK EXPERIENCE
            ================================================== */}

            <section className="profile-card profile-section">

                <div className="profile-section-header">

                    <div>

                        <h2>
                            💼 Kinh nghiệm làm việc
                        </h2>

                        <p>
                            Lịch sử kinh nghiệm làm việc
                        </p>

                    </div>

                    <button
                        type="button"
                        className="profile-add-btn"
                        onClick={() => {
                            resetExperienceForm();
                            setShowExperienceForm(true);
                        }}
                    >
                        + Thêm kinh nghiệm
                    </button>

                </div>


                {experiences.length === 0 ? (

                    <div className="profile-empty">
                        Chưa có kinh nghiệm làm việc.
                    </div>

                ) : (

                    <div className="profile-list">

                        {experiences.map(item => (

                            <div
                                className="profile-list-item"
                                key={item.id}
                            >

                                <div className="profile-list-content">

                                    <h3>
                                        {item.position || 'Nhân viên'}
                                    </h3>

                                    <p>
                                        <strong>
                                            {item.company_name}
                                        </strong>
                                    </p>

                                    <p>
                                        {item.start_date || '--'}
                                        {' → '}
                                        {item.end_date || 'Hiện tại'}
                                    </p>

                                    {item.description && (

                                        <p>
                                            {item.description}
                                        </p>

                                    )}

                                </div>


                                <div className="profile-actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            editExperience(item)
                                        }
                                    >
                                        Sửa
                                    </button>

                                    <button
                                        type="button"
                                        className="danger"
                                        onClick={() =>
                                            deleteExperience(item.id)
                                        }
                                    >
                                        Xóa
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}


                {/* FORM */}

                {showExperienceForm && (
                    <form
                        className="profile-sub-form"
                        onSubmit={saveExperience}
                    >

                    <h3>
                        {editingExperienceId
                            ? 'Chỉnh sửa kinh nghiệm'
                            : 'Thêm kinh nghiệm'}
                    </h3>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Công ty *
                            </label>

                            <input
                                name="company_name"
                                value={
                                    experienceForm.company_name
                                }
                                onChange={
                                    handleExperienceChange
                                }
                                placeholder="Tên công ty"
                                required
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Vị trí
                            </label>

                            <input
                                name="position"
                                value={
                                    experienceForm.position
                                }
                                onChange={
                                    handleExperienceChange
                                }
                                placeholder="Backend Developer..."
                            />

                        </div>

                    </div>


                    <div className="form-row">

                        <div className="form-group">

                            <label>
                                Ngày bắt đầu
                            </label>

                            <input
                                type="date"
                                name="start_date"
                                value={
                                    experienceForm.start_date
                                }
                                onChange={
                                    handleExperienceChange
                                }
                            />

                        </div>


                        <div className="form-group">

                            <label>
                                Ngày kết thúc
                            </label>

                            <input
                                type="date"
                                name="end_date"
                                value={
                                    experienceForm.end_date
                                }
                                onChange={
                                    handleExperienceChange
                                }
                            />

                        </div>

                    </div>


                    <div className="form-group">

                        <label>
                            Mô tả công việc
                        </label>

                        <textarea
                            name="description"
                            value={
                                experienceForm.description
                            }
                            onChange={
                                handleExperienceChange
                            }
                            rows="5"
                            placeholder="Mô tả công việc đã thực hiện..."
                        />

                    </div>


                    <div className="profile-form-actions">

                        <button
                            type="submit"
                            className="profile-save-btn"
                        >
                            {editingExperienceId
                                ? 'Cập nhật'
                                : 'Thêm kinh nghiệm'}
                        </button>

                        {editingExperienceId && (

                            <button
                                type="button"
                                className="profile-cancel-btn"
                                onClick={
                                    resetExperienceForm
                                }
                            >
                                Hủy
                            </button>

                        )}

                    </div>

                    </form>
                )}

            </section>

        </div>
    );
};

export default EmployeeProfile;