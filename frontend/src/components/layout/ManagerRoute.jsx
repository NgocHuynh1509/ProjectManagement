import { useContext } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

export default function ManagerRoute() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return <div className="route-loading">Đang tải khu vực quản trị...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== 'manager') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}