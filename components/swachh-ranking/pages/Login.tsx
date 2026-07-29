import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Eye, EyeOff, ShieldCheck, Lock, Mail } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            navigate('/dashboard');
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', {
                email,
                password
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            window.location.href = '/dashboard';
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page" style={{
            background: 'linear-gradient(135deg, var(--swachh-green) 0%, var(--swachh-green-light) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
        }}>
            <div className="card shadow-premium" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '3.5rem',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                position: 'relative'
            }}>
                <Link to="/" style={{
                    position: 'absolute',
                    top: '1.25rem',
                    left: '1.25rem',
                    color: 'var(--swachh-green-light)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    letterSpacing: '0.05em'
                }}>
                    ← BACK TO HOME
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '60px',
                        height: '60px',
                        backgroundColor: 'var(--swachh-green)',
                        color: 'white',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 10px 20px rgba(26, 77, 46, 0.2)'
                    }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: 900,
                        color: 'var(--swachh-green)',
                        marginBottom: '0.5rem',
                        letterSpacing: '-0.02em'
                    }}>
                        Portal Access
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500 }}>
                        Internal Management System
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--error-soft)',
                        color: 'var(--error-dark)',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                        border: '1px solid rgba(244, 63, 94, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                        <label htmlFor="login-email" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail
                                size={18}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                            />
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="name@pune.gov.in"
                                style={{ paddingLeft: '3rem' }}
                            />
                        </div>
                    </div>

                    <div className="form-group" style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.625rem' }}>
                            <label htmlFor="login-password" style={{ marginBottom: 0, color: 'var(--swachh-green)', fontWeight: 700 }}>Password</label>
                            <a href="#" style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green-light)', textDecoration: 'none' }}>Forgot?</a>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock
                                size={18}
                                style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
                            />
                            <input
                                id="login-password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    padding: '4px',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{
                            width: '100%',
                            padding: '1.125rem',
                            backgroundColor: 'var(--swachh-green)',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '1rem',
                            letterSpacing: '0.025em',
                            boxShadow: '0 8px 20px rgba(26, 77, 46, 0.25)'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'AUTHENTICATING...' : 'ACCESS PORTAL'}
                    </button>
                </form>

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Unauthorized access is prohibited
                    </p>
                    <Link to="/register" style={{
                        color: 'var(--swachh-green-light)',
                        fontWeight: 800,
                        fontSize: '0.9375rem',
                        textDecoration: 'none',
                        borderBottom: '2px solid var(--swachh-accent)'
                    }}>
                        Request Access Credentials
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
