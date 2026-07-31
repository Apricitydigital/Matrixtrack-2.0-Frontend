import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Eye, EyeOff, ShieldCheck, User, Phone, Mail, Fingerprint, Briefcase, Lock } from 'lucide-react';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        mobileNumber: '',
        email: '',
        password: '',
        confirmPassword: '',
        aadharNumber: '',
        role: 'accessor',
        accessorType: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (formData.password !== formData.confirmPassword) {
            setLoading(false);
            return setError('Passwords do not match');
        }
        if (formData.mobileNumber.length !== 10) {
            setLoading(false);
            return setError('Mobile must be a valid 10-digit number');
        }
        if (formData.aadharNumber && formData.aadharNumber.length !== 12) {
            setLoading(false);
            return setError('Aadhar must be a valid 12-digit number');
        }

        try {
            await api.post('/auth/register', formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 4000);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="auth-page" style={{
                background: 'linear-gradient(135deg, var(--swachh-green) 0%, var(--swachh-green-light) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                minHeight: '100vh'
            }}>
                <div className="card shadow-premium" style={{ width: '100%', maxWidth: '480px', padding: '3.5rem', textAlign: 'center', backgroundColor: 'white' }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        backgroundColor: 'var(--success-soft)',
                        color: 'var(--success)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        boxShadow: '0 8px 16px rgba(16, 185, 129, 0.1)'
                    }}>
                        <ShieldCheck size={40} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', color: 'var(--swachh-green)' }}>Request Submitted!</h2>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '2rem', fontWeight: 500 }}>
                        Your application has been received and is currently <strong>pending admin approval</strong>. You will be able to access the portal once your credentials are verified.
                    </p>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        Auto-redirecting to portal login...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page" style={{
            background: 'linear-gradient(135deg, var(--swachh-green) 0%, var(--swachh-green-light) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            minHeight: '100vh'
        }}>
            <div className="card shadow-premium" style={{
                width: '100%',
                maxWidth: '640px',
                padding: '4rem',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                position: 'relative'
            }}>
                <Link to="/" style={{
                    position: 'absolute',
                    top: '1.5rem',
                    left: '1.5rem',
                    color: 'var(--swachh-green-light)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    textDecoration: 'none',
                    letterSpacing: '0.05em'
                }}>
                    ← BACK TO HOME
                </Link>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
                    <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--swachh-green)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                        Portal Registration
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', fontWeight: 500 }}>
                        Apply for official system access
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: 'var(--error-soft)',
                        color: 'var(--error-dark)',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        marginBottom: '2rem',
                        textAlign: 'center',
                        border: '1px solid rgba(244, 63, 94, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="reg-name" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-name"
                                    type="text"
                                    placeholder="Full Name"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-mobile" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Mobile Number</label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-mobile"
                                    type="text"
                                    placeholder="10-digit #"
                                    maxLength={10}
                                    value={formData.mobileNumber}
                                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value.replace(/\D/g, '') })}
                                    required
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="reg-email" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-email"
                                    type="email"
                                    placeholder="name@pune.gov.in"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label htmlFor="reg-aadhar" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Aadhar Number (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <Fingerprint size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-aadhar"
                                    type="text"
                                    placeholder="12-digit # (optional)"
                                    maxLength={12}
                                    value={formData.aadharNumber}
                                    onChange={(e) => setFormData({ ...formData, aadharNumber: e.target.value.replace(/\D/g, '') })}
                                    style={{ paddingLeft: '3rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: formData.role === 'accessor' ? '1fr 1fr' : '1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="reg-role" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Role Assignment</label>
                            <div style={{ position: 'relative' }}>
                                <Briefcase size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <select
                                    id="reg-role"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    required
                                    style={{ paddingLeft: '3rem' }}
                                >
                                    <option value="accessor">Accessor</option>
                                    <option value="qc">QC</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        {formData.role === 'accessor' && (
                            <div className="form-group">
                                <label htmlFor="reg-accessor-type" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Assessor Organization</label>
                                <select
                                    id="reg-accessor-type"
                                    value={formData.accessorType}
                                    onChange={(e) => setFormData({ ...formData, accessorType: e.target.value })}
                                    required
                                >
                                    <option value="">Select Type</option>
                                    <option value="pmc">PMC</option>
                                    <option value="hms">HMS</option>
                                    <option value="janwani">Janwani</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
                        <div className="form-group">
                            <label htmlFor="reg-password" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.8rem',
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
                        <div className="form-group">
                            <label htmlFor="reg-confirm-password" style={{ color: 'var(--swachh-green)', fontWeight: 700 }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    id="reg-confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    required
                                    style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
                                />
                                <button
                                    type="button"
                                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '0.8rem',
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
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
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
                        {loading ? 'PROCESSING APPLICATION...' : 'SUBMIT APPLICATION'}
                    </button>
                </form>

                <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                        Already have access?
                    </p>
                    <Link to="/login" style={{
                        color: 'var(--swachh-green-light)',
                        fontWeight: 800,
                        fontSize: '1rem',
                        textDecoration: 'none',
                        borderBottom: '2px solid var(--swachh-accent)'
                    }}>
                        Portal Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Register;
