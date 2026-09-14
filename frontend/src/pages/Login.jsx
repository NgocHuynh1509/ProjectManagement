import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../services/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showReset, setShowReset] = useState(false);
    const [resetStep, setResetStep] = useState('email');
    const [resetOtp, setResetOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetMessage, setResetMessage] = useState('');

    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const loggedInUser = await login(email, password);

            const from = location.state?.from?.pathname;

            if (from) {
                navigate(from, { replace: true });
                return;
            }

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
        } finally {
            setIsLoading(false);
        }
    };

    const requestOtp = async (e) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/forgot-password', { email });
            setResetMessage(response.data.message);
            setResetStep('otp');
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể gửi OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setIsLoading(true);
        try {
            const response = await api.post('/auth/reset-password', {
                email,
                otp: resetOtp,
                password: newPassword
            });
            setResetMessage(response.data.message);
            setShowReset(false);
            setResetStep('email');
            setResetOtp('');
            setNewPassword('');
            setPassword('');
        } catch (err) {
            setError(err.response?.data?.error || 'Không thể đặt lại mật khẩu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">

            <div className="login-card">

                {/* Logo */}
                <div className="logo">
                    <div className="logo-icon">QL</div>
                    <div>
                        <h1>QLNS</h1>
                        <span>Management System</span>
                    </div>
                </div>

                <div className="login-title">
                    <h2>Đăng nhập</h2>
                    <p>Đăng nhập để tiếp tục</p>
                </div>

                {/* Error */}
                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {resetMessage && <div className="success-message">{resetMessage}</div>}

                {showReset ? (
                    <form onSubmit={resetStep === 'email' ? requestOtp : resetPassword}>
                        <div className="form-group">
                            <label>Email</label>
                            <div className="input-wrapper"><span className="input-icon">✉</span><input type="email" placeholder="Nhập email tài khoản" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                        </div>
                        {resetStep === 'otp' && <>
                            <div className="form-group"><label>OTP qua email</label><div className="input-wrapper"><span className="input-icon">🔢</span><input inputMode="numeric" maxLength="6" placeholder="Nhập OTP 6 số" value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))} required /></div></div>
                            <div className="form-group"><label>Mật khẩu mới</label><div className="input-wrapper"><span className="input-icon">🔒</span><input type="password" minLength="6" placeholder="Ít nhất 6 ký tự" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></div></div>
                        </>}
                        <button type="submit" className="login-button" disabled={isLoading}>{isLoading ? 'Đang xử lý...' : resetStep === 'email' ? 'Gửi mã OTP' : 'Đặt lại mật khẩu'}</button>
                        <button type="button" className="forgot-password reset-back-button" onClick={() => { setShowReset(false); setResetStep('email'); setError(''); }}>Quay lại đăng nhập</button>
                    </form>
                ) : (

                <form onSubmit={handleSubmit}>

                    {/* Email */}
                    <div className="form-group">
                        <label>Email</label>

                        <div className="input-wrapper">
                            <span className="input-icon">✉</span>

                            <input
                                type="email"
                                placeholder="Nhập email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div className="form-group">
                        <label>Mật khẩu</label>

                        <div className="input-wrapper">
                            <span className="input-icon">🔒</span>

                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Nhập mật khẩu"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />

                            <button
                                type="button"
                                className="show-password"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                            >
                                {showPassword ? 'Ẩn' : 'Hiện'}
                            </button>
                        </div>
                    </div>

                    {/* Remember */}
                    <div className="login-options">
                        <label className="remember">
                            <input type="checkbox" />
                            <span>Ghi nhớ đăng nhập</span>
                        </label>

                        <button
                            type="button"
                            className="forgot-password"
                            onClick={() => { setShowReset(true); setError(''); setResetMessage(''); }}
                        >
                            Quên mật khẩu?
                        </button>
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                Đang đăng nhập...
                            </>
                        ) : (
                            'Đăng nhập'
                        )}
                    </button>

                </form>
                )}

                <div className="security">
                    🔐 Thông tin đăng nhập được bảo mật
                </div>

            </div>

            <style>{`

                * {
                    box-sizing: border-box;
                }

                .login-page {
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background: #f4f7fb;
                    padding: 20px;
                    font-family: Arial, sans-serif;
                }

                .login-card {
                    width: 100%;
                    max-width: 420px;
                    background: white;
                    padding: 40px;
                    border-radius: 16px;
                    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.08);
                }

                .logo {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 35px;
                }

                .logo-icon {
                    width: 48px;
                    height: 48px;
                    background: #2563eb;
                    color: white;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                    font-weight: bold;
                }

                .logo h1 {
                    margin: 0;
                    font-size: 24px;
                    color: #1e293b;
                }

                .logo span {
                    font-size: 12px;
                    color: #64748b;
                }

                .login-title {
                    text-align: center;
                    margin-bottom: 28px;
                }

                .login-title h2 {
                    margin: 0 0 8px;
                    font-size: 26px;
                    color: #1e293b;
                }

                .login-title p {
                    margin: 0;
                    color: #64748b;
                    font-size: 14px;
                }

                .error-message {
                    background: #fef2f2;
                    color: #dc2626;
                    border: 1px solid #fecaca;
                    padding: 11px 13px;
                    border-radius: 8px;
                    font-size: 14px;
                    margin-bottom: 18px;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-group label {
                    display: block;
                    margin-bottom: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    color: #334155;
                }

                .input-wrapper {
                    display: flex;
                    align-items: center;
                    height: 48px;
                    border: 1px solid #dbe2ea;
                    border-radius: 8px;
                    padding: 0 12px;
                    transition: 0.2s;
                }

                .input-wrapper:focus-within {
                    border-color: #2563eb;
                    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
                }

                .input-icon {
                    margin-right: 10px;
                    font-size: 15px;
                }

                .input-wrapper input {
                    flex: 1;
                    height: 100%;
                    border: none;
                    outline: none;
                    font-size: 14px;
                    color: #1e293b;
                }

                .input-wrapper input::placeholder {
                    color: #94a3b8;
                }

                .show-password {
                    border: none;
                    background: none;
                    color: #2563eb;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 600;
                }

                .login-options {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    font-size: 13px;
                }

                .remember {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    color: #64748b;
                    cursor: pointer;
                }

                .remember input {
                    cursor: pointer;
                }

                .forgot-password {
                    border: none;
                    background: none;
                    color: #2563eb;
                    cursor: pointer;
                    font-size: 13px;
                    padding: 0;
                }

                .login-button {
                    width: 100%;
                    height: 48px;
                    border: none;
                    border-radius: 8px;
                    background: #2563eb;
                    color: white;
                    font-size: 15px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: 0.2s;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 8px;
                }

                .login-button:hover {
                    background: #1d4ed8;
                }

                .login-button:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.4);
                    border-top-color: white;
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }

                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }

                .security {
                    text-align: center;
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid #eef2f7;
                    font-size: 12px;
                    color: #94a3b8;
                }

                @media (max-width: 480px) {
                    .login-card {
                        padding: 30px 22px;
                    }
                }

            `}</style>
        </div>
    );
};

export default Login;