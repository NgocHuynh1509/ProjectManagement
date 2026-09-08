import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import './Layout.css';

export default function ManagerLayout() {
  return (
    <div className="manager-layout">
      <Sidebar />
      <div className="main-content">
        <Header />
        <main className="manager-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
