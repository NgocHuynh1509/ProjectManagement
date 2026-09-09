import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const Home = () => {
    const { user, logout, loading } = useContext(AuthContext);
    const navigate = useNavigate();
    const [managerData, setManagerData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!loading && !user) {
            navigate('/login');
        }
    }, [user, loading, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const fetchManagerData = async () => {
        try {
            setError('');
            const response = await api.get('/manager-only');
            setManagerData(response.data.message);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch manager data');
        }
    };

    if (loading) return <div>Loading...</div>;
    if (!user) return null;

    return (
        <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Dashboard</h1>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '20px' }}>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Role:</strong> <span style={{ padding: '4px 8px', background: user.role === 'manager' ? '#ffc107' : '#17a2b8', color: '#fff', borderRadius: '4px' }}>{user.role}</span></p>
            </div>

            {user.role === 'manager' && (
                <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #ffc107', borderRadius: '8px' }}>
                    <h3>Manager Zone</h3>
                    <p>Welcome to the manager area.</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={fetchManagerData} style={{ padding: '8px 16px', background: '#ffc107', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            Test Manager API
                        </button>
                    </div>
                    {managerData && <p style={{ color: 'green', marginTop: '10px' }}>{managerData}</p>}
                    {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
                </div>
            )}

            <button onClick={handleLogout} style={{ padding: '10px 20px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Logout
            </button>
        </div>
    );
};

export default Home;
