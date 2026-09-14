import { useEffect, useState } from 'react';
import { ArrowLeft, BriefcaseBusiness, GraduationCap, Award, Code2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../services/api';
import './HR.css';

const tabs = [
	{ id: 'personal', label: 'Thông tin cá nhân' }, { id: 'qualifications', label: 'Bằng cấp' }, { id: 'certificates', label: 'Chứng chỉ' },
	{ id: 'experience', label: 'Kinh nghiệm' }, { id: 'skills', label: 'Kỹ năng' }, { id: 'awards', label: 'Giải thưởng' }, { id: 'projects', label: 'Dự án đã tham gia' },
];
const skillProgress = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };

export default function EmployeeDetail() {
	const navigate = useNavigate();
	const { employeeId } = useParams();
	const [employee, setEmployee] = useState(null);
	const [activeTab, setActiveTab] = useState('personal');
	const [error, setError] = useState('');
	const [options, setOptions] = useState({ departments: [], positions: [] });
	const [savingAssignment, setSavingAssignment] = useState(false);
	const [assignmentMessage, setAssignmentMessage] = useState('');
	const [editingPersonalInfo, setEditingPersonalInfo] = useState(false);
	const [personalForm, setPersonalForm] = useState({});

	useEffect(() => {
		api.get(`/employees/${employeeId}`)
			.then(({ data }) => {
				setEmployee(data);
				setPersonalForm({ ...data });
			})
			.catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải hồ sơ nhân viên.'));
		api.get('/employees/options')
			.then(({ data }) => setOptions(data))
			.catch(() => setError('Không thể tải danh sách phòng ban và chức vụ.'));
	}, [employeeId]);

	const updateAssignment = async (event) => {
		event.preventDefault();
		try {
			setSavingAssignment(true);
			setAssignmentMessage('');
			const { data } = await api.put(`/employees/${employeeId}`, {
				department_id: event.target.department_id.value || null,
				position_id: event.target.position_id.value || null
			});
			setEmployee((current) => ({ ...current, ...data }));
			setAssignmentMessage('Đã cập nhật phòng ban và chức vụ.');
		} catch (requestError) {
			setAssignmentMessage(requestError.response?.data?.error || 'Không thể cập nhật phân công.');
		} finally {
			setSavingAssignment(false);
		}
	};

	const updatePersonalForm = (event) => {
		setPersonalForm((current) => ({
			...current,
			[event.target.name]: event.target.value
		}));
	};

	const savePersonalInfo = async (event) => {
		event.preventDefault();
		try {
			setSavingAssignment(true);
			setAssignmentMessage('');
			const { data } = await api.put(`/employees/${employeeId}`, personalForm);
			setEmployee((current) => ({ ...current, ...data }));
			setPersonalForm((current) => ({ ...current, ...data }));
			setEditingPersonalInfo(false);
			setAssignmentMessage('Đã cập nhật thông tin nhân sự.');
		} catch (requestError) {
			setAssignmentMessage(requestError.response?.data?.error || 'Không thể cập nhật thông tin nhân sự.');
		} finally {
			setSavingAssignment(false);
		}
	};

	if (error) return <div className="page-container"><div className="glass-panel empty-state error-message">{error}</div></div>;
	if (!employee) return <div className="page-container"><div className="glass-panel empty-state">Đang tải hồ sơ...</div></div>;

	const renderList = (items, fields) => items.length ? items.map((item) => (
		<div className="profile-record" key={item.id || item.name || item.project_id}><strong>{fields.title(item)}</strong><p>{fields.detail(item)}</p></div>
	)) : <div className="empty-state">Chưa có dữ liệu.</div>;

	return <div className="page-container">
		<button className="btn btn-outline back-button" onClick={() => navigate('/manager/hr')}><ArrowLeft size={18} /> Quay lại danh sách</button>
		<div className="profile-layout">
			<aside className="glass-panel profile-tabs">
				<div className="profile-summary">
					{employee.avatar_url ? <img className="profile-avatar-large" src={employee.avatar_url} alt={employee.full_name} /> : <div className="profile-avatar-large avatar-fallback">{employee.full_name.charAt(0)}</div>}
					<h2>{employee.full_name}</h2><span className="profile-role">{employee.positions?.name || 'Chưa cập nhật chức vụ'}</span><span className={`badge ${employee.status}`}>{employee.status.replace('_', ' ')}</span>
				</div>
				<nav className="tab-nav">{tabs.map((tab) => <button key={tab.id} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>)}</nav>
			</aside>
			<section className="glass-panel profile-content">
				{activeTab === 'personal' && <div className="tab-pane"><div className="personal-heading"><h2>Thông tin cá nhân</h2><button type="button" className="btn btn-primary" onClick={() => { setPersonalForm({ ...employee }); setEditingPersonalInfo(true); }}>Chỉnh sửa</button></div>{editingPersonalInfo ? <form className="personal-edit-form" onSubmit={savePersonalInfo}><div className="info-grid"><EditField label="Mã nhân viên" name="employee_code" value={personalForm.employee_code} onChange={updatePersonalForm} /><EditField label="Họ tên" name="full_name" value={personalForm.full_name} onChange={updatePersonalForm} /><EditField label="Email" name="email" type="email" value={personalForm.email} onChange={updatePersonalForm} /><EditField label="Số điện thoại" name="phone" value={personalForm.phone} onChange={updatePersonalForm} /><EditField label="Ngày sinh" name="date_of_birth" type="date" value={personalForm.date_of_birth} onChange={updatePersonalForm} /><label>Giới tính<select className="form-input" name="gender" value={personalForm.gender || ''} onChange={updatePersonalForm}><option value="">Chưa cập nhật</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label><EditField label="CCCD" name="national_id" value={personalForm.national_id} onChange={updatePersonalForm} /><EditField label="Ngày cấp CCCD" name="national_id_issue_date" type="date" value={personalForm.national_id_issue_date} onChange={updatePersonalForm} /><EditField label="Nơi cấp CCCD" name="national_id_issue_place" value={personalForm.national_id_issue_place} onChange={updatePersonalForm} /><EditField label="Ngày vào làm" name="hire_date" type="date" value={personalForm.hire_date} onChange={updatePersonalForm} /><label>Phòng ban<select className="form-input" name="department_id" value={personalForm.department_id || ''} onChange={updatePersonalForm}><option value="">Chưa phân công</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Chức vụ<select className="form-input" name="position_id" value={personalForm.position_id || ''} onChange={updatePersonalForm}><option value="">Chưa phân công</option>{options.positions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="full-width">Địa chỉ<textarea className="form-input" name="address" value={personalForm.address || ''} onChange={updatePersonalForm} rows="3" /></label></div><div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setEditingPersonalInfo(false)}>Hủy</button><button className="btn btn-primary" disabled={savingAssignment}>{savingAssignment ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>{assignmentMessage && <p>{assignmentMessage}</p>}</form> : <><div className="info-grid"><Info label="Mã nhân viên" value={employee.employee_code} /><Info label="Email" value={employee.email} /><Info label="Số điện thoại" value={employee.phone} /><Info label="Phòng ban" value={employee.departments?.name} /><Info label="Ngày sinh" value={employee.date_of_birth} /><Info label="Giới tính" value={employee.gender} /><Info label="Ngày vào làm" value={employee.hire_date} /><Info label="CCCD" value={employee.national_id} /><Info label="Địa chỉ" value={employee.address} fullWidth /></div>{assignmentMessage && <p>{assignmentMessage}</p>}</>}</div>}
				{activeTab === 'qualifications' && <RecordPane icon={<GraduationCap size={20} />} title="Bằng cấp">{renderList(employee.qualifications, { title: (item) => item.degree_name, detail: (item) => [item.school, item.major, item.graduation_year, item.degree_type].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'certificates' && <RecordPane icon={<Award size={20} />} title="Chứng chỉ">{(employee.certificates || []).length ? <div className="certificate-list">{employee.certificates.map((certificate) => <article className="profile-record certificate-record" key={certificate.id}><strong>{certificate.name || 'Chứng chỉ chưa đặt tên'}</strong><p>Đơn vị cấp: {certificate.issuer || 'Chưa cập nhật'}</p><p>Ngày cấp: {certificate.issue_date || 'Chưa cập nhật'}</p><p>Ngày hết hạn: {certificate.expiry_date || 'Không có thời hạn'}</p>{certificate.credential_url && <a href={certificate.credential_url} target="_blank" rel="noreferrer">Xem chứng chỉ</a>}</article>)}</div> : <div className="empty-state">Chưa có chứng chỉ.</div>}</RecordPane>}
				{activeTab === 'experience' && <RecordPane icon={<BriefcaseBusiness size={20} />} title="Kinh nghiệm làm việc">{renderList(employee.experience, { title: (item) => item.position || item.company_name, detail: (item) => [item.company_name, item.start_date, item.end_date || 'Hiện tại', item.description].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'skills' && <RecordPane icon={<Code2 size={20} />} title="Kỹ năng"><div className="skills-list">{employee.skills.length ? employee.skills.map((skill) => <div className="skill-item" key={skill.name}><div className="skill-header"><span className="skill-name">{skill.name}</span><span className="skill-exp">{skill.yearsExperience || 0} năm</span></div><div className="progress-bg"><div className="progress-bar" style={{ width: `${skillProgress[skill.proficiency] || 50}%`, backgroundColor: 'var(--primary)' }} /></div><span className="skill-level">{skill.proficiency}</span></div>) : <div className="empty-state">Chưa có dữ liệu.</div>}</div></RecordPane>}
				{activeTab === 'awards' && <RecordPane icon={<Award size={20} />} title="Giải thưởng">{renderList(employee.awards, { title: (item) => item.name, detail: (item) => [item.issuer, item.award_date, item.description].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'projects' && <RecordPane icon={<BriefcaseBusiness size={20} />} title="Dự án đã tham gia">{renderList(employee.projects, { title: (item) => item.projects?.name, detail: (item) => [item.role_in_project, item.projects?.status].filter(Boolean).join(' • ') })}</RecordPane>}
			</section>
		</div>
	</div>;
}

function Info({ label, value, fullWidth }) { return <div className={`info-group ${fullWidth ? 'full-width' : ''}`}><label>{label}</label><span>{value || 'Chưa cập nhật'}</span></div>; }
function EditField({ label, name, type = 'text', value, onChange }) { return <label>{label}<input className="form-input" name={name} type={type} value={value || ''} onChange={onChange} /></label>; }
function RecordPane({ icon, title, children }) { return <div className="tab-pane"><h2 className="record-title">{icon}{title}</h2>{children}</div>; }
