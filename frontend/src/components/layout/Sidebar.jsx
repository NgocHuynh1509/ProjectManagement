import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Briefcase, 
  Clock, 
  ShieldCheck, 
  Settings
} from 'lucide-react';
import './Layout.css';

const navItems = [
  { path: '/manager/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/manager/hr', icon: Users, label: 'Nhân Sự' },
  { path: '/manager/projects', icon: Briefcase, label: 'Dự Án' },
  { path: '/manager/attendance', icon: Clock, label: 'Chấm Công' },
  { path: '/manager/accounts', icon: ShieldCheck, label: 'Tài Khoản' },
  { path: '/manager/settings', icon: Settings, label: 'Cài Đặt' },
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="avatar">HR</div>
        <span>Manager Pro</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
