import { Bell, Search, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContext';
import './Layout.css';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-header">
      <div className="header-search glass-panel">
        <Search size={18} color="var(--text-secondary)" />
        <input type="text" placeholder="Tìm kiếm..." />
      </div>

      <div className="header-actions">
        <button className="icon-btn" title="Thông báo">
          <Bell size={20} />
        </button>
        
        <div className="user-profile">
          <img 
            src="https://api.dicebear.com/7.x/avataaars/svg?seed=Manager" 
            alt="Ảnh đại diện" 
            className="avatar"
          />
          <div className="user-info">
            <span className="user-name">{user?.name || user?.email || 'Manager'}</span>
            <span className="user-role">Quản lý</span>
          </div>
        </div>

        <button className="icon-btn" title="Đăng xuất" onClick={handleLogout}>
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
