import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';

const EmployeeRoute = () => {

    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return (
            <div className="route-loading">
                Đang kiểm tra đăng nhập...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (user.role !== 'employee') {
        return <Navigate to="/unauthorized" replace />;
    }

    return <Outlet />;
};

export default EmployeeRoute;