import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Phone, ClipboardList, ShieldCheck } from 'lucide-react';

const RESEND_COOLDOWN = 30; // seconds

const SelfAssessmentLogin = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
    const [mobile, setMobile] = useState('');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const startResendTimer = () => {
        setResendTimer(RESEND_COOLDOWN);
        timerRef.current = setInterval(() => {
            setResendTimer(prev => {
                if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^[6-9]\d{9}$/.test(mobile.trim())) {
            setError('Please enter a valid 10-digit mobile number');
            return;
        }

        setLoading(true);
        try {
            await api.post('/self-assessment/send-otp', { mobile: mobile.trim() });
            setStep('otp');
            startResendTimer();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!/^\d{6}$/.test(otp.trim())) {
            setError('Please enter the 6-digit OTP');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/self-assessment/verify-otp', {
                mobile: mobile.trim(),
                otp: otp.trim(),
            });
            const { participant, questions, draft } = res.data;

            if (participant.alreadySubmitted) {
                setError('You have already submitted your assessment. Thank you for participating!');
                return;
            }

            navigate('/self-assessment/form', { state: { participant, questions, draft } });
        } catch (err: any) {
            setError(err.response?.data?.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (resendTimer > 0) return;
        setError('');
        setOtp('');
        setLoading(true);
        try {
            await api.post('/self-assessment/send-otp', { mobile: mobile.trim() });
            startResendTimer();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to resend OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const alreadyDone = error.includes('already submitted');

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, var(--swachh-green) 0%, var(--swachh-green-light) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
        }}>
            <div className="card shadow-premium" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.75rem 2.25rem',
                border: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(10px)',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'var(--swachh-green)',
                        color: 'white',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 10px 20px rgba(26, 77, 46, 0.2)',
                    }}>
                        {step === 'mobile' ? <ClipboardList size={32} /> : <ShieldCheck size={32} />}
                    </div>
                    <h1 style={{
                        fontSize: '1.625rem',
                        fontWeight: 900,
                        color: 'var(--swachh-green)',
                        marginBottom: '0.375rem',
                        letterSpacing: '-0.02em',
                    }}>
                        Self Assessment
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
                        {step === 'mobile' ? 'Swachh Pune Ranking' : `OTP sent to +91 ${mobile}`}
                    </p>
                </div>

                {error && (
                    <div style={{
                        backgroundColor: alreadyDone ? 'rgba(16,185,129,0.08)' : 'var(--error-soft)',
                        color: alreadyDone ? 'var(--success-dark)' : 'var(--error-dark)',
                        padding: '0.875rem 1rem',
                        borderRadius: '10px',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        marginBottom: '1.25rem',
                        textAlign: 'center',
                        border: `1px solid ${alreadyDone ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.2)'}`,
                    }}>
                        {error}
                    </div>
                )}

                {step === 'mobile' ? (
                    <form onSubmit={handleSendOtp}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem' }}>
                                Registered Mobile Number
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Phone size={18} style={{
                                    position: 'absolute',
                                    left: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-secondary)',
                                    pointerEvents: 'none',
                                }} />
                                <input
                                    type="tel"
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    required
                                    placeholder="Enter your 10-digit mobile number"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    style={{ paddingLeft: '3rem', fontSize: '1rem', letterSpacing: '0.05em' }}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: 'var(--swachh-green)',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '1rem',
                                letterSpacing: '0.025em',
                                boxShadow: '0 8px 20px rgba(26, 77, 46, 0.25)',
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Sending OTP...' : 'Send OTP →'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp}>
                        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                            <label style={{ color: 'var(--swachh-green)', fontWeight: 700, fontSize: '0.875rem' }}>
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                placeholder="Enter 6-digit OTP"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                style={{ fontSize: '1.25rem', letterSpacing: '0.35em', textAlign: 'center' }}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                padding: '1rem',
                                backgroundColor: 'var(--swachh-green)',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '1rem',
                                letterSpacing: '0.025em',
                                boxShadow: '0 8px 20px rgba(26, 77, 46, 0.25)',
                            }}
                            disabled={loading}
                        >
                            {loading ? 'Verifying...' : 'Verify & Continue →'}
                        </button>

                        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resendTimer > 0 || loading}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: resendTimer > 0 ? 'default' : 'pointer',
                                    color: resendTimer > 0 ? 'var(--text-secondary)' : 'var(--swachh-green)',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                }}
                            >
                                {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                            </button>
                            <span style={{ margin: '0 0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>·</span>
                            <button
                                type="button"
                                onClick={() => { setStep('mobile'); setOtp(''); setError(''); }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--text-secondary)',
                                    fontWeight: 600,
                                    fontSize: '0.875rem',
                                }}
                            >
                                Change Number
                            </button>
                        </div>
                    </form>
                )}

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <Link to="/unified-login" style={{
                        color: 'var(--swachh-green-light)',
                        fontWeight: 700,
                        fontSize: '0.8125rem',
                        textDecoration: 'none',
                        opacity: 0.75,
                    }}>
                        Staff Portal Login →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default SelfAssessmentLogin;
