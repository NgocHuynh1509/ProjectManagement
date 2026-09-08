import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';

const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('employee');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { register, user, loading } = useContext(AuthContext);
    const navigate = useNavigate();

    // Only allow managers
    if (!loading && (!user || user.role !== 'manager')) {
        return (
            <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
                <h2>Access Denied</h2>
                <p>Only managers can create new accounts.</p>
                <button onClick={() => navigate('/')} style={{ padding: '10px', background: '#007bff', color: '#fff', border: 'none', cursor: 'pointer' }}>Back to Dashboard</button>
            </div>
        );
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await register(email, password, role);
            setSuccess('Account created successfully!');
            setEmail('');
            setPassword('');
            setRole('employee');
            // setTimeout(() => navigate('/'), 2000); // Optional: redirect back to dashboard
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create account');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
            <h2>Create New Account</h2>
            {error && <p style={{ color: 'red' }}>{error}</p>}
            {success && <p style={{ color: 'green' }}>{success}</p>}
            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ padding: '10px' }}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                </select>
                <button type="submit" style={{ padding: '10px', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>Create Account</button>
            </form>
            <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}>
                    &larr; Back to Dashboard
                </button>
            </div>
        </div>
    );
};

export default Register;
