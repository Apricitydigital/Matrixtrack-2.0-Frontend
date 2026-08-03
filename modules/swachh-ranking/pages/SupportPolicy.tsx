import { Link } from 'react-router-dom';
import PmcLogo from '../components/PmcLogo';
import SwachhParvLogo from '../assets/swachh-parv-logo.png';

const SupportPolicy = () => {
    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'var(--font-main)' }}>
            <nav className="main-navbar">
                <div className="nav-left">
                    <PmcLogo size={72} />
                </div>
                <div className="header-actions">
                    <Link to="/" aria-label="Swachh Pune home" className="header-logo-link">
                        <img src={typeof SwachhParvLogo === 'string' ? SwachhParvLogo : (SwachhParvLogo as any)?.src || (SwachhParvLogo as any)} alt="Swachh Pune Sankalp 2026" className="header-logo" />
                    </Link>
                    <Link to="/login" className="portal-link">Portal Login</Link>
                </div>
            </nav>

            <main style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(2rem, 6vw, 4rem) 5%' }}>
                {/* Page Header */}
                <div style={{
                    backgroundColor: 'var(--swachh-green)',
                    color: 'white',
                    padding: '2.5rem 2rem',
                    borderRadius: '16px',
                    marginBottom: '2.5rem',
                    textAlign: 'center'
                }}>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2.25rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                        Support Policy
                    </h1>
                    <p style={{ opacity: 0.85, fontSize: '1rem', margin: 0 }}>
                        Swachh Ranking Application &mdash; Apricity Digital Labs Private Limited
                    </p>
                </div>

                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: 'clamp(1.5rem, 5vw, 3rem)', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

                    <Section num="1" title="Purpose">
                        <p>
                            This Support Policy outlines the support framework, communication channels, response timelines,
                            maintenance process, and limitations applicable to the Swachh Ranking Application provided by
                            Apricity Digital Labs Private Limited.
                        </p>
                        <p>
                            The purpose of this policy is to ensure that users and stakeholders receive timely, reliable,
                            and structured assistance for issues related to the application.
                        </p>
                    </Section>

                    <Section num="2" title="Support Commitment">
                        <p>
                            Apricity Digital is committed to providing dependable technical and operational support for the
                            Swachh Ranking Application. Our support team aims to ensure smooth application performance,
                            minimize service interruptions, and resolve reported issues in a timely and professional manner.
                        </p>
                    </Section>

                    <Section num="3" title="Support Availability">
                        <p>Support services are available during the following working schedule:</p>
                        <PolicyTable
                            headers={['Category', 'Availability']}
                            rows={[
                                ['Working Days', 'Monday to Saturday'],
                                ['Support Hours', '10:00 AM to 6:00 PM IST'],
                                ['Critical Issues', 'May be addressed outside normal working hours, if required'],
                            ]}
                        />
                        <p style={{ marginTop: '1rem' }}>
                            Critical issues affecting application availability, login access, data submission, or core
                            operations may be prioritized outside regular support hours based on severity and business impact.
                        </p>
                    </Section>

                    <Section num="4" title="Support Channels">
                        <p>
                            Users may contact the support team through official communication channels approved by Apricity
                            Digital. Users are encouraged to provide clear issue details, screenshots, device information,
                            app version, and steps to reproduce the issue for faster resolution.
                        </p>
                    </Section>

                    <Section num="5" title="Issue Priority, Response & Resolution Timeline">
                        <p>Reported issues will be reviewed and categorized based on severity, user impact, and operational urgency.</p>
                        <PolicyTable
                            headers={['Priority', 'Issue Type', 'Initial Response Target', 'Resolution Target']}
                            rows={[
                                ['High', 'App crash, login failure, server downtime, data submission failure, major service disruption', 'Within 2 hours', 'Within 24 hours'],
                                ['Medium', 'Feature malfunction, sync issues, incorrect display of data, non-critical workflow issues', 'Within 6 hours', '2–3 business days'],
                                ['Low', 'UI issues, minor bugs, suggestions, enhancement requests, cosmetic issues', 'Within 24 hours', 'Planned in upcoming release cycle'],
                            ]}
                        />
                        <p style={{ marginTop: '1rem' }}>
                            Resolution timelines may vary depending on issue complexity, third-party service dependency,
                            user response time, or infrastructure-related constraints.
                        </p>
                    </Section>

                    <Section num="6" title="Data Privacy & Security">
                        <p>
                            Apricity Digital takes user data privacy and application security seriously. We follow reasonable
                            administrative, technical, and operational safeguards to protect user data from unauthorized
                            access, misuse, alteration, or disclosure.
                        </p>
                        <BulletList items={[
                            'Sensitive user information is not shared with unauthorized third parties.',
                            'Access to administrative systems is restricted to authorized personnel only.',
                            'User data is handled in accordance with applicable data protection and privacy requirements.',
                            'Security-related issues are treated with priority and investigated promptly.',
                        ]} />
                    </Section>

                    <Section num="7" title="Maintenance & Application Updates">
                        <p>
                            Apricity Digital may release periodic updates to improve application performance, security,
                            usability, and reliability. Maintenance activities may include:
                        </p>
                        <BulletList items={[
                            'Bug fixes',
                            'Security updates',
                            'Performance improvements',
                            'Feature enhancements',
                            'Server-side or infrastructure maintenance',
                        ]} />
                        <p style={{ marginTop: '1rem' }}>
                            Emergency maintenance may be performed without prior notice when required to protect application
                            stability, data integrity, or security. Users are advised to keep the application updated to
                            the latest available version for the best experience and continued support.
                        </p>
                    </Section>

                    <Section num="8" title="Supported Platforms & Compatibility">
                        <p>The Swachh Ranking Mobile Application is officially supported on the following platforms:</p>
                        <PolicyTable
                            headers={['Platform', 'Supported Version']}
                            rows={[
                                ['Android', 'Android 8.0 Oreo and above'],
                                ['iOS', 'iOS 13 and above'],
                            ]}
                        />
                        <p style={{ marginTop: '1rem' }}>
                            Support may be limited for outdated operating systems, unsupported devices, modified operating
                            systems, or devices that do not meet minimum technical requirements.
                        </p>
                    </Section>

                    <Section num="9" title="Limitations of Support">
                        <p>Support may be limited or unavailable in the following cases:</p>
                        <BulletList items={[
                            'Use of unsupported, rooted, or jailbroken devices',
                            'Issues caused by unstable internet connectivity or network restrictions',
                            'Problems resulting from outdated application versions',
                            'Device-specific hardware or operating system limitations',
                            'Third-party service outages beyond Apricity Digital\'s control',
                            'Unauthorized modification, misuse, or tampering with the application',
                            'Issues caused by incorrect user-provided information or credentials',
                        ]} />
                        <p style={{ marginTop: '1rem' }}>
                            Apricity Digital will make reasonable efforts to assist users but cannot guarantee resolution
                            for issues outside the application's control.
                        </p>
                    </Section>

                    <Section num="10" title="User Responsibilities">
                        <p>To help ensure timely support, users are expected to:</p>
                        <BulletList items={[
                            'Use the latest version of the application',
                            'Provide accurate issue details while reporting a problem',
                            'Maintain stable internet connectivity while using the application',
                            'Keep login credentials secure and confidential',
                            'Avoid using the application on unsupported or modified devices',
                            'Cooperate with the support team during troubleshooting',
                        ]} />
                    </Section>

                    <Section num="11" title="Contact Information">
                        <p>For support, assistance, or issue reporting, users may contact:</p>
                        <div style={{
                            backgroundColor: '#f0fdf4',
                            border: '1.5px solid var(--swachh-green)',
                            borderRadius: '12px',
                            padding: '1.25rem 1.5rem',
                            marginTop: '1rem'
                        }}>
                            <p style={{ fontWeight: 700, color: 'var(--swachh-green)', marginBottom: '0.25rem' }}>
                                Apricity Digital Support Team
                            </p>
                            <p style={{ margin: 0 }}>
                                Email:{' '}
                                <a
                                    href="mailto:info@apricitydigital.in"
                                    style={{ color: 'var(--swachh-green)', fontWeight: 600 }}
                                >
                                    info@apricitydigital.in
                                </a>
                            </p>
                        </div>
                        <p style={{ marginTop: '1rem' }}>
                            Support requests should include the user's name, registered mobile number or email ID, device
                            model, app version, issue description, and screenshots where applicable.
                        </p>
                    </Section>

                    <Section num="12" title="Policy Updates">
                        <p>
                            Apricity Digital reserves the right to update or modify this Support Policy from time to time
                            to reflect operational, technical, legal, or business requirements. Any significant changes may
                            be communicated through appropriate official channels.
                        </p>
                    </Section>

                    {/* Footer Meta */}
                    <div style={{
                        marginTop: '2.5rem',
                        paddingTop: '1.5rem',
                        borderTop: '1px solid #e2e8f0',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)'
                    }}>
                        <span><strong>Effective Date:</strong> 18 May 2026</span>
                        <span><strong>Issued By:</strong> Apricity Digital Labs Private Limited</span>
                        <span><strong>Application:</strong> Swachh Ranking Application</span>
                    </div>
                </div>
            </main>

            <footer style={{ backgroundColor: 'var(--swachh-green)', color: 'white', padding: '4rem 5%', textAlign: 'center' }}>
                <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>
                    © 2026 Pune Municipal Corporation - Swachh Pune Mission. All rights reserved.
                </p>
                <p style={{ opacity: 0.85, fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Design &amp; Development by Apricity Digital Labs Private Limited
                </p>
            </footer>
        </div>
    );
};

/* ── Sub-components ── */

const Section = ({ num, title, children }: { num: string; title: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            fontWeight: 800,
            color: 'var(--swachh-green)',
            marginBottom: '0.75rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid #e2e8f0'
        }}>
            {num}. {title}
        </h2>
        <div style={{ color: '#374151', lineHeight: 1.75, fontSize: '0.9375rem' }}>
            {children}
        </div>
    </div>
);

const BulletList = ({ items }: { items: string[] }) => (
    <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0', lineHeight: 1.75 }}>
        {items.map((item, i) => (
            <li key={i} style={{ marginBottom: '0.25rem' }}>{item}</li>
        ))}
    </ul>
);

const PolicyTable = ({ headers, rows }: { headers: string[]; rows: string[][] }) => (
    <div style={{ overflowX: 'auto', marginTop: '0.75rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
                <tr style={{ backgroundColor: 'var(--swachh-green)', color: 'white' }}>
                    {headers.map((h, i) => (
                        <th key={i} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? 'white' : '#f8fafc' }}>
                        {row.map((cell, ci) => (
                            <td key={ci} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #edf2f7', verticalAlign: 'top' }}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

export default SupportPolicy;
