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

	useEffect(() => {
		api.get(`/employees/${employeeId}`)
			.then(({ data }) => setEmployee(data))
			.catch((requestError) => setError(requestError.response?.data?.error || 'Không thể tải hồ sơ nhân viên.'));
	}, [employeeId]);

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
				{activeTab === 'personal' && <div className="tab-pane"><h2>Thông tin cá nhân</h2><div className="info-grid"><Info label="Mã nhân viên" value={employee.employee_code} /><Info label="Email" value={employee.email} /><Info label="Số điện thoại" value={employee.phone} /><Info label="Phòng ban" value={employee.departments?.name} /><Info label="Ngày sinh" value={employee.date_of_birth} /><Info label="Giới tính" value={employee.gender} /><Info label="Ngày vào làm" value={employee.hire_date} /><Info label="CCCD" value={employee.national_id} /><Info label="Địa chỉ" value={employee.address} fullWidth /></div></div>}
				{activeTab === 'qualifications' && <RecordPane icon={<GraduationCap size={20} />} title="Bằng cấp">{renderList(employee.qualifications, { title: (item) => item.degree_name, detail: (item) => [item.school, item.major, item.graduation_year, item.degree_type].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'certificates' && <RecordPane icon={<Award size={20} />} title="Chứng chỉ">{renderList(employee.certificates, { title: (item) => item.name, detail: (item) => [item.issuer, `Cấp: ${item.issue_date || 'N/A'}`, `Hết hạn: ${item.expiry_date || 'N/A'}`].join(' • ') })}</RecordPane>}
				{activeTab === 'experience' && <RecordPane icon={<BriefcaseBusiness size={20} />} title="Kinh nghiệm làm việc">{renderList(employee.experience, { title: (item) => item.position || item.company_name, detail: (item) => [item.company_name, item.start_date, item.end_date || 'Hiện tại', item.description].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'skills' && <RecordPane icon={<Code2 size={20} />} title="Kỹ năng"><div className="skills-list">{employee.skills.length ? employee.skills.map((skill) => <div className="skill-item" key={skill.name}><div className="skill-header"><span className="skill-name">{skill.name}</span><span className="skill-exp">{skill.yearsExperience || 0} năm</span></div><div className="progress-bg"><div className="progress-bar" style={{ width: `${skillProgress[skill.proficiency] || 50}%`, backgroundColor: 'var(--primary)' }} /></div><span className="skill-level">{skill.proficiency}</span></div>) : <div className="empty-state">Chưa có dữ liệu.</div>}</div></RecordPane>}
				{activeTab === 'awards' && <RecordPane icon={<Award size={20} />} title="Giải thưởng">{renderList(employee.awards, { title: (item) => item.name, detail: (item) => [item.issuer, item.award_date, item.description].filter(Boolean).join(' • ') })}</RecordPane>}
				{activeTab === 'projects' && <RecordPane icon={<BriefcaseBusiness size={20} />} title="Dự án đã tham gia">{renderList(employee.projects, { title: (item) => item.projects?.name, detail: (item) => [item.role_in_project, item.projects?.status].filter(Boolean).join(' • ') })}</RecordPane>}
			</section>
		</div>
	</div>;
}

function Info({ label, value, fullWidth }) { return <div className={`info-group ${fullWidth ? 'full-width' : ''}`}><label>{label}</label><span>{value || 'Chưa cập nhật'}</span></div>; }
function RecordPane({ icon, title, children }) { return <div className="tab-pane"><h2 className="record-title">{icon}{title}</h2>{children}</div>; }
