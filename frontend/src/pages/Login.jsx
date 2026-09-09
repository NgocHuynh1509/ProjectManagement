import { useState, useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const { login } = useContext(AuthContext);

    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            // Login và lấy user
            const loggedInUser = await login(email, password);

            // Nếu trước đó user bị redirect tới login
            // thì quay lại trang cũ
            const from = location.state?.from?.pathname;

            if (from) {
                navigate(from, { replace: true });
                return;
            }

            // Điều hướng theo role
            if (loggedInUser.role === 'manager') {
                navigate('/manager/dashboard', { replace: true });
            } else if (loggedInUser.role === 'employee') {
                navigate('/employee', { replace: true });
            } else {
                navigate('/unauthorized', { replace: true });
            }

        } catch (err) {
            console.error('Login error:', err);

            setError(
                err.response?.data?.error ||
                err.message ||
                'Đăng nhập thất bại'
            );
        }
    };

    return (
        <div
            style={{
                maxWidth: '400px',
                margin: '50px auto',
                padding: '20px',
                border: '1px solid #ccc',
                borderRadius: '8px'
            }}
        >
            <h2>Login</h2>

            {error && (
                <p style={{ color: 'red' }}>
                    {error}
                </p>
            )}

            <form
                onSubmit={handleSubmit}
                autoComplete="off"
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}
            >
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ padding: '10px' }}
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ padding: '10px' }}
                />

                <button
                    type="submit"
                    style={{
                        padding: '10px',
                        background: '#007bff',
                        color: '#fff',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Login
                </button>
            </form>
        </div>
    );
};

export default Login;