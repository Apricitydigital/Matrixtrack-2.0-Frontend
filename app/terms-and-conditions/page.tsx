'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    FileText,
    ShieldCheck,
    ArrowLeft,
    Search,
    Printer,
    Calendar,
    RefreshCw,
    Building2,
    BookOpen,
    CheckCircle2,
    UserCheck,
    Lock,
    Users,
    MapPin,
    Camera,
    Bot,
    BarChart3,
    AlertTriangle,
    Scale,
    Gavel,
    Mail,
    Shield
} from 'lucide-react';

export default function TermsAndConditionsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const sections = [
        { id: 'sec-1', number: '1', title: 'Purpose of MatrixTrack 2.0' },
        { id: 'sec-2', number: '2', title: 'Authorized Users' },
        { id: 'sec-3', number: '3', title: 'Account and Login' },
        { id: 'sec-4', number: '4', title: 'Role-Based Access' },
        { id: 'sec-5', number: '5', title: 'Organization Responsibilities' },
        { id: 'sec-7', number: '7', title: 'Location Usage' },
        { id: 'sec-9', number: '9', title: 'Inspection Responsibilities' },
        { id: 'sec-10', number: '10', title: 'Inspection Modules' },
        { id: 'sec-11', number: '11', title: 'Quality Control' },
        { id: 'sec-12', number: '12', title: 'Action Required and Action Taken' },
        { id: 'sec-13', number: '13', title: 'AI-Assisted Suggestions and Analysis' },
        { id: 'sec-14', number: '14', title: 'Dashboards and Performance Metrics' },
        { id: 'sec-15', number: '15', title: 'Accuracy of Submitted Information' },
        { id: 'sec-16', number: '16', title: 'Photographs and Content' },
        { id: 'sec-17', number: '17', title: 'Confidentiality' },
        { id: 'sec-18', number: '18', title: 'Prohibited Activities' },
        { id: 'sec-19', number: '19', title: 'Security Monitoring' },
        { id: 'sec-20', number: '20', title: 'Intellectual Property' },
        { id: 'sec-21', number: '21', title: 'Third-Party Services' },
        { id: 'sec-22', number: '22', title: 'Platform Availability' },
        { id: 'sec-23', number: '23', title: 'Account Suspension' },
        { id: 'sec-24', number: '24', title: 'Termination of Access' },
        { id: 'sec-25', number: '25', title: 'Privacy' },
        { id: 'sec-26', number: '26', title: 'Disclaimer' },
        { id: 'sec-27', number: '27', title: 'Limitation of Liability' },
        { id: 'sec-28', number: '28', title: 'Official and Government Records' },
        { id: 'sec-29', number: '29', title: 'Changes to MatrixTrack' },
        { id: 'sec-30', number: '30', title: 'Changes to These Terms' },
        { id: 'sec-31', number: '31', title: 'Customer Agreement' },
        { id: 'sec-32', number: '32', title: 'Governing Law and Jurisdiction' },
        { id: 'sec-33', number: '33', title: 'Contact Information' },
    ];

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const matchesSearch = (text: string) => {
        if (!searchQuery.trim()) return true;
        return text.toLowerCase().includes(searchQuery.toLowerCase());
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500 selection:text-white print:bg-white print:text-slate-900">
            <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          body { background: white !important; color: black !important; }
          .policy-card { border: none !important; box-shadow: none !important; background: transparent !important; color: black !important; }
        }
      `}</style>

            {/* TOP STICKY HEADER NAV */}
            <header className="no-print sticky top-0 z-50 backdrop-blur-xl bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/portal-home"
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition border border-slate-700/60 no-underline"
                    >
                        <ArrowLeft size={14} /> Back to Portal
                    </Link>
                    <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
                            <FileText size={18} />
                        </div>
                        <div>
                            <span className="text-sm font-black text-white tracking-tight leading-none block">
                                MatrixTrack 2.0
                            </span>
                            <span className="text-[10px] font-semibold text-indigo-400 leading-none">
                                Terms and Conditions
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Search & Actions */}
                <div className="flex items-center gap-3">
                    <div className="relative hidden md:block w-64">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search terms sections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                        />
                    </div>

                    <button
                        onClick={handlePrint}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/20"
                    >
                        <Printer size={14} /> Print Terms
                    </button>
                </div>
            </header>

            {/* HERO BANNER */}
            <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-12 px-4 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-4 uppercase tracking-widest">
                        <Scale size={14} /> Official Terms of Service
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
                        MATRIXTRACK 2.0 TERMS AND CONDITIONS
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-400 mb-6">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <Calendar size={13} className="text-indigo-400" /> Effective Date: <strong className="text-white">2 September 2026</strong>
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <RefreshCw size={13} className="text-emerald-400" /> Last Updated: <strong className="text-white">2 September 2026</strong>
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <Building2 size={13} className="text-violet-400" /> Operator: <strong className="text-white">Apricity Digital Labs Pvt Ltd</strong>
                        </span>
                    </div>

                    <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                        These Terms and Conditions (“Terms”) govern access to and use of MatrixTrack 2.0, including its website, web portal, mobile application, dashboards, APIs, modules and related technology services (“Platform”).
                    </p>

                    <div className="mt-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 max-w-3xl mx-auto text-left text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
                        <p>
                            MatrixTrack 2.0 is operated by Apricity Digital Labs Pvt Ltd (“MatrixTrack”, “we”, “us” or “our”).
                        </p>
                        <p className="font-semibold text-indigo-200">
                            By accessing or using MatrixTrack 2.0, a user agrees to comply with these Terms, the MatrixTrack Privacy Policy, applicable organizational policies and applicable law.
                        </p>
                        <p className="text-slate-400 text-xs">
                            Where MatrixTrack is provided to a user through a municipal corporation, Urban Local Body (“ULB”), government department, institution, employer or other organization, the user’s access is also subject to the rules and authorization of that organization.
                        </p>
                    </div>
                </div>
            </section>

            {/* MAIN LAYOUT WITH SIDEBAR & CONTENT */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 py-10 grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* LEFT SIDEBAR: TOC */}
                <aside className="no-print lg:col-span-4 xl:col-span-3 space-y-4">
                    <div className="sticky top-20 bg-slate-800/50 border border-slate-800 rounded-2xl p-4 backdrop-blur-md">
                        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-700/60 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <BookOpen size={15} className="text-indigo-400" /> Navigation Index
                        </div>

                        <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 text-xs custom-scrollbar">
                            {sections.map((sec) => (
                                <button
                                    key={sec.id}
                                    onClick={() => scrollToSection(sec.id)}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 font-medium ${activeSection === sec.id
                                            ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-600/30'
                                            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/80'
                                        }`}
                                >
                                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${activeSection === sec.id ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                        {sec.number}
                                    </span>
                                    <span className="truncate">{sec.title}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                {/* RIGHT CONTENT AREA */}
                <main className="lg:col-span-8 xl:col-span-9 space-y-8 print-full-width">

                    {/* SECTION 1 */}
                    {matchesSearch('Purpose MatrixTrack 2.0 Workforce Employee Attendance Field Inspections Sweeping Toilet Litter Bin Taskforce Quality Control Action Required Action Taken Ward Zone Performance Ward Ranking Administrative') && (
                        <article id="sec-1" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                                    1
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">1. Purpose of MatrixTrack 2.0</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack 2.0 is an operational technology platform designed to assist authorized organizations with functions including:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs sm:text-sm text-slate-200">
                                {[
                                    'Workforce management',
                                    'Employee management',
                                    'Attendance',
                                    'Field monitoring',
                                    'Inspections',
                                    'Sweeping operations',
                                    'Toilet inspections',
                                    'Litter Bin / Twin Bin inspections',
                                    'Taskforce operations',
                                    'Quality Control',
                                    'Action Required / Action Taken workflows',
                                    'Ward and zone monitoring',
                                    'Performance analytics',
                                    'Ward Ranking',
                                    'Reporting',
                                    'Administrative dashboards'
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <CheckCircle2 size={15} className="text-indigo-400 shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400 italic pt-2">
                                Features available to a particular user depend on their organization, role and assigned modules.
                            </p>
                        </article>
                    )}

                    {/* SECTION 2 */}
                    {matchesSearch('Authorized Users Commissioners City Administrators ULB Officers Action Officers QC Supervisors Employees') && (
                        <article id="sec-2" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    2
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">2. Authorized Users</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may be used only by authorized users. Depending on organizational configuration, authorized users may include:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-200">
                                {[
                                    'Commissioners',
                                    'City Administrators',
                                    'ULB Officers',
                                    'Action Officers',
                                    'QC personnel',
                                    'Supervisors',
                                    'Employees'
                                ].map((role) => (
                                    <div key={role} className="bg-slate-900/60 border border-slate-700/40 p-2.5 rounded-xl font-medium text-center text-slate-200">
                                        {role}
                                    </div>
                                ))}
                            </div>

                            <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-800/40 text-xs text-blue-200 font-semibold">
                                Notice: Having an account does not provide unrestricted access to all MatrixTrack information.
                            </div>
                        </article>
                    )}

                    {/* SECTION 3 */}
                    {matchesSearch('Account Login Email Mobile Password Confidentiality Device Sharing Audit Logs') && (
                        <article id="sec-3" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-sm">
                                    3
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">3. Account and Login</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Each authorized user may be provided with an individual MatrixTrack account. Users may log in using either:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-violet-200 text-center">
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                                    Registered Email Address + Password
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                                    Registered Mobile Number + Password
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">Users are responsible for:</h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                    {[
                                        'Providing accurate account information',
                                        'Using only their assigned account',
                                        'Keeping their password confidential',
                                        'Protecting devices used to access MatrixTrack',
                                        'Preventing unauthorized use of their account',
                                        'Immediately reporting suspected unauthorized access'
                                    ].map((item) => (
                                        <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                            ✓ {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-2 pt-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">Users must NOT:</h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                    {[
                                        'Share passwords with another person',
                                        'Use another employee’s account',
                                        'Allow another person to perform activities through their account',
                                        'Attempt to obtain another user’s password or credentials'
                                    ].map((item) => (
                                        <li key={item} className="bg-rose-950/20 border border-rose-800/30 px-3 py-2 rounded-lg text-rose-200">
                                            ✗ {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <p className="text-xs text-slate-400 pt-2 border-t border-slate-800">
                                Activities performed through an authenticated account may be recorded in MatrixTrack audit logs.
                            </p>
                        </article>
                    )}

                    {/* SECTION 4 */}
                    {matchesSearch('Role-Based Access Scope City Role Module Zone Ward Area Beat Restrictions') && (
                        <article id="sec-4" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                                    4
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">4. Role-Based Access</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Access within MatrixTrack is based on assigned roles and organizational scope. Permissions may depend on:
                            </p>

                            <div className="flex flex-wrap gap-2 text-xs text-slate-200 font-bold">
                                {['City', 'Role', 'Module', 'Zone', 'Ward', 'Area', 'Beat', 'Assigned responsibility'].map((tag) => (
                                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                                Users must access only the information required for their authorized responsibilities. Attempting to bypass role restrictions or gain unauthorized access is strictly prohibited.
                            </p>
                        </article>
                    )}

                    {/* SECTION 5 */}
                    {matchesSearch('Organization Responsibilities Authorizing Assigning Hierarchy Removing Access Lawful') && (
                        <article id="sec-5" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    5
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">5. Organization Responsibilities</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Organizations using MatrixTrack are responsible for:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-200">
                                {[
                                    'Authorizing appropriate users',
                                    'Providing accurate employee information',
                                    'Assigning correct user roles',
                                    'Maintaining organizational hierarchy and assignments',
                                    'Removing access when a user is no longer authorized',
                                    'Ensuring lawful use of employee information',
                                    'Establishing required organizational notices or permissions',
                                    'Reviewing operational decisions made using Platform information'
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <Building2 size={15} className="text-amber-400 shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 7 */}
                    {matchesSearch('Location Usage Attendance Inspections GPS Spoof Falsify Disputed') && (
                        <article id="sec-7" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-sm">
                                    7
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">7. Location Usage</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Where location permission is required for attendance, inspections or field activity, users must permit legitimate location verification necessary for the applicable functionality.
                            </p>

                            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-800/40 text-xs text-rose-200 font-bold">
                                Strict Rule: Users must not intentionally falsify, alter or spoof location information.
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                                Technical location inaccuracies may occur, and organizations should maintain an appropriate review process where location information is disputed.
                            </p>
                        </article>
                    )}

                    {/* SECTION 9 */}
                    {matchesSearch('Inspection Responsibilities Photographs Old Downloaded False Duplicate Evidence Misleading') && (
                        <article id="sec-9" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm">
                                    9
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">9. Inspection Responsibilities</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Users conducting inspections or field activities must submit accurate information concerning the actual work performed. Users must <strong>NOT</strong> intentionally submit:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-200">
                                {[
                                    'Old photographs as current evidence',
                                    'Downloaded photographs',
                                    'Unrelated photographs',
                                    'Manipulated photographs',
                                    'False inspection information',
                                    'Incorrect location information',
                                    'Misleading remarks',
                                    'Duplicate evidence intended to falsely represent completed work'
                                ].map((item) => (
                                    <div key={item} className="bg-rose-950/20 border border-rose-800/30 p-2.5 rounded-xl font-medium text-center text-rose-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400 pt-2">
                                Inspection evidence should relate directly to the assigned asset, facility, beat, location or task.
                            </p>
                        </article>
                    )}

                    {/* SECTION 10 */}
                    {matchesSearch('Inspection Modules Sweeping Toilets Litter Bins Beats Areas Municipal') && (
                        <article id="sec-10" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm">
                                    10
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">10. Inspection Modules</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Depending on permissions, MatrixTrack may support inspections or reports relating to:
                            </p>

                            <div className="flex flex-wrap gap-2 text-xs text-slate-200 font-bold">
                                {['Sweeping', 'Toilets', 'Litter Bins', 'Beats', 'Areas', 'Configured municipal operations'].map((mod) => (
                                    <span key={mod} className="px-3.5 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-300">
                                        {mod}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                Users must follow the inspection requirements established by the relevant organization.
                            </p>
                        </article>
                    )}

                    {/* SECTION 11 */}
                    {matchesSearch('Quality Control Approved Rejected Review Standards Statuses') && (
                        <article id="sec-11" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-sm">
                                    11
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">11. Quality Control</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Inspection records may be reviewed through a Quality Control process. Depending on the configured workflow, QC personnel may review inspection evidence and classify reports according to authorized statuses such as:
                            </p>

                            <div className="grid grid-cols-2 gap-3 text-center text-xs sm:text-sm font-bold">
                                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300">
                                    Approved
                                </div>
                                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300">
                                    Rejected
                                </div>
                            </div>

                            <p className="text-xs text-slate-400">
                                QC users must perform reviews using the information available to them and their organization’s applicable standards.
                            </p>
                        </article>
                    )}

                    {/* SECTION 12 */}
                    {matchesSearch('Action Required Action Taken ULB Officers Action Officers Corrective Activity') && (
                        <article id="sec-12" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-sm">
                                    12
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">12. Action Required and Action Taken</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Where configured, authorized ULB Officers or other designated personnel may mark qualifying reports as <strong>Action Required</strong>. Authorized Action Officers or responsible personnel may subsequently record corrective activity as <strong>Action Taken</strong> or another configured completion status.
                            </p>

                            <p className="text-xs text-teal-300 font-medium">
                                Users must provide accurate remarks and evidence while completing these workflows.
                            </p>
                        </article>
                    )}

                    {/* SECTION 13 */}
                    {matchesSearch('AI-Assisted Suggestions Analysis Automated Evidence Assessment Anomaly Detection Insights Disciplinary') && (
                        <article id="sec-13" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-black text-sm">
                                    13
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">13. AI-Assisted Suggestions and Analysis</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may provide AI-assisted or automated functionality for purposes including:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                                {[
                                    'Evidence analysis',
                                    'Inspection assessment',
                                    'Suggested actions',
                                    'Report summaries',
                                    'Anomaly detection',
                                    'Recommendations',
                                    'Operational insights'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 p-2 rounded-lg text-center text-slate-200">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-fuchsia-950/30 border border-fuchsia-800/40 text-xs text-fuchsia-200 leading-relaxed">
                                <strong>Important Legal Notice:</strong> AI-generated information is intended to assist authorized personnel. Because automated outputs may contain errors or incomplete interpretations, important disciplinary, legal, financial or employment decisions should not be based solely on an AI-generated suggestion without appropriate review.
                            </div>
                        </article>
                    )}

                    {/* SECTION 14 */}
                    {matchesSearch('Dashboards Performance Metrics Attendance Inspection Completion Approved Rejected Action Required Action Taken Ward Rankings KPIs') && (
                        <article id="sec-14" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    14
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">14. Dashboards and Performance Metrics</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may provide operational metrics including:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Attendance percentage',
                                    'Inspection completion',
                                    'Expected vs. actual work',
                                    'Approved reports',
                                    'Rejected reports',
                                    'Action Required cases',
                                    'Action Taken cases',
                                    'Employee performance',
                                    'Supervisor performance',
                                    'Zone performance',
                                    'Ward performance',
                                    'Ward rankings',
                                    'Inspection scores',
                                    'Configured KPIs'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed">
                                Metrics depend on the information available to MatrixTrack and the applicable calculation methodology. The relevant organization remains responsible for determining how these metrics are used for administrative, workforce or policy decisions.
                            </p>
                        </article>
                    )}

                    {/* SECTION 15 */}
                    {matchesSearch('Accuracy Submitted Information Errors Record Integrity Restrictions Editing') && (
                        <article id="sec-15" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm">
                                    15
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">15. Accuracy of Submitted Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Users are responsible for ensuring that information submitted through their account is accurate to the best of their knowledge. Where permitted, errors should be promptly reported or corrected.
                            </p>

                            <p className="text-xs text-orange-300 font-medium">
                                Certain attendance, inspection, QC or audit records may be restricted from editing after submission to maintain record integrity.
                            </p>
                        </article>
                    )}

                    {/* SECTION 16 */}
                    {matchesSearch('Photographs Content Unlawful Fraudulent Misleading Malicious Infringing Inappropriate') && (
                        <article id="sec-16" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm">
                                    16
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">16. Photographs and Content</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Users must upload only content relevant to authorized MatrixTrack activities. Users must <strong>NOT</strong> upload content that is:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-rose-200">
                                {[
                                    'Unlawful',
                                    'Fraudulent',
                                    'Intentionally misleading',
                                    'Malicious',
                                    'Unrelated to assigned work',
                                    'Infringing another person’s rights',
                                    'Inappropriate for the relevant organizational purpose'
                                ].map((item) => (
                                    <div key={item} className="bg-rose-950/20 border border-rose-800/30 px-3 py-2 rounded-lg text-slate-200">
                                        ✗ {item}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 17 */}
                    {matchesSearch('Confidentiality Screenshots Employee Information Internal Dashboard Export') && (
                        <article id="sec-17" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    17
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">17. Confidentiality</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Information available through MatrixTrack may contain confidential workforce, operational or government information. Users must not disclose such information to unauthorized individuals.
                            </p>

                            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 space-y-1">
                                <p className="font-bold">Prohibited Disclosures:</p>
                                <p>Users must not improperly share screenshots, attendance records, employee information, inspection photographs, export confidential reports, disclose passwords or internal dashboard information unless authorized for an official purpose.</p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 18 */}
                    {matchesSearch('Prohibited Activities Unauthorized Hack Malware Scrape Spoof Impersonate') && (
                        <article id="sec-18" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm">
                                    18
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">18. Prohibited Activities</h2>
                            </div>

                            <p className="text-sm text-slate-300">Users must <strong>NOT</strong>:</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                {[
                                    'Access MatrixTrack without authorization',
                                    'Access another person’s account',
                                    'Circumvent role-based permissions',
                                    'Attempt to hack or interfere with the Platform',
                                    'Introduce malware or malicious code',
                                    'Scrape information without authorization',
                                    'Manipulate attendance information',
                                    'Manipulate inspection records',
                                    'Spoof GPS/location',
                                    'Impersonate another person',
                                    'Manipulate audit records',
                                    'Upload fraudulent evidence',
                                    'Use the Platform for illegal activities',
                                    'Intentionally disrupt MatrixTrack services'
                                ].map((item) => (
                                    <div key={item} className="bg-red-950/20 border border-red-800/30 p-2.5 rounded-xl text-red-200">
                                        ⛔ {item}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 19 */}
                    {matchesSearch('Security Monitoring Audit Logs Login Activity Authentication Incidents') && (
                        <article id="sec-19" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    19
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">19. Security Monitoring</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may maintain security and audit information relating to:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                                {['Login activity', 'Authentication', 'User actions', 'Administrative actions', 'System access', 'Changes to records', 'Security incidents'].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-center text-slate-200">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                Such information may be used to protect the Platform and investigate suspected misuse.
                            </p>
                        </article>
                    )}

                    {/* SECTION 20 */}
                    {matchesSearch('Intellectual Property Software Source code Apricity Digital Labs Pvt Ltd Ownership') && (
                        <article id="sec-20" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-sm">
                                    20
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">20. Intellectual Property</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Unless otherwise agreed in writing, MatrixTrack 2.0 technology, including its software, source code, application interfaces, dashboards, designs, branding, documentation, system architecture and proprietary functionality is owned by or licensed to <strong>Apricity Digital Labs Pvt Ltd</strong>.
                            </p>

                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 space-y-1">
                                <p>Access to MatrixTrack does not transfer ownership of the Platform to users.</p>
                                <p className="text-violet-300 font-medium">Rights relating to operational data belonging to a customer organization will be governed by the applicable agreement and law.</p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 21 */}
                    {matchesSearch('Third-Party Services Cloud Storage Mapping Notifications Identity Authentication') && (
                        <article id="sec-21" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-sm">
                                    21
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">21. Third-Party Services</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may rely on third-party technology for cloud infrastructure, storage, mapping, notifications, security, identity verification, authentication and other integrations. Availability of certain Platform functionality may therefore depend on third-party services.
                            </p>
                        </article>
                    )}

                    {/* SECTION 22 */}
                    {matchesSearch('Platform Availability Maintenance Updates Connectivity Infrastructure Uninterrupted') && (
                        <article id="sec-22" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    22
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">22. Platform Availability</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack aims to maintain reliable Platform functionality. However, availability may occasionally be affected by maintenance, software updates, internet connectivity, cloud infrastructure problems, third-party outages, device issues, security incidents or events outside reasonable control.
                            </p>

                            <p className="text-xs text-slate-400 italic">
                                No technology platform can guarantee uninterrupted availability at all times.
                            </p>
                        </article>
                    )}

                    {/* SECTION 23 */}
                    {matchesSearch('Account Suspension Fraudulent Misuse Violations Restrict Suspend Disable') && (
                        <article id="sec-23" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm">
                                    23
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">23. Account Suspension</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack or the authorized organization may restrict, suspend or disable an account where there is reasonable concern regarding:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-rose-200">
                                {[
                                    'Unauthorized access',
                                    'Fraudulent attendance',
                                    'Fraudulent inspection evidence',
                                    'Credential sharing',
                                    'Security violations',
                                    'Misuse of employee data',
                                    'Attempted hacking',
                                    'Violation of organizational policies',
                                    'Violation of these Terms',
                                    'Loss of authorization to use MatrixTrack'
                                ].map((item) => (
                                    <div key={item} className="bg-rose-950/20 border border-rose-800/30 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 24 */}
                    {matchesSearch('Termination of Access Employment Authorization Retained Records') && (
                        <article id="sec-24" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400 font-black text-sm">
                                    24
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">24. Termination of Access</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                A user’s MatrixTrack access may end when employment or assignment ends, authorization is withdrawn, role changes, organization requests termination, or Terms are violated.
                            </p>

                            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-300 font-medium">
                                Termination of an account does not necessarily result in deletion of official attendance, inspection, QC, audit or operational records that must continue to be retained.
                            </div>
                        </article>
                    )}

                    {/* SECTION 25 */}
                    {matchesSearch('Privacy Privacy Policy Governance Processing') && (
                        <article id="sec-25" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    25
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">25. Privacy</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Processing of personal information through MatrixTrack is governed by the separate <Link href="/privacy-policy" className="text-blue-400 hover:underline font-bold">MatrixTrack 2.0 Privacy Policy</Link>. Users must use personal information available through MatrixTrack only for authorized purposes.
                            </p>
                        </article>
                    )}

                    {/* SECTION 26 */}
                    {matchesSearch('Disclaimer Statutory authority Administrative judgment Operational AI') && (
                        <article id="sec-26" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    26
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">26. Disclaimer</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack 2.0 is an operational technology platform designed to assist organizations with workforce, attendance, inspection, reporting and monitoring functions. MatrixTrack does not replace the statutory authority, administrative responsibility or professional judgment of the organization using the Platform.
                            </p>
                        </article>
                    )}

                    {/* SECTION 27 */}
                    {matchesSearch('Limitation of Liability Apricity Digital Labs Incidental Consequential Excludes') && (
                        <article id="sec-27" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                                    27
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">27. Limitation of Liability</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                To the maximum extent permitted by applicable law and subject to any separate written agreement, Apricity Digital Labs Pvt Ltd will not be responsible for indirect, incidental, special or consequential loss arising solely from false information submitted by users, unauthorized account sharing, independent organization decisions, third-party service outages, or user device/internet failures.
                            </p>
                        </article>
                    )}

                    {/* SECTION 28 */}
                    {matchesSearch('Official Government Records Administrative Attendance Inspection QC Audit Disclosure') && (
                        <article id="sec-28" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                                    28
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">28. Official and Government Records</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Attendance records, inspection reports, QC decisions, Action Required records, Action Taken records and other information created through MatrixTrack may form part of an organization’s official or administrative records. Such records may therefore be retained or disclosed where required for organizational administration, government requirements, audit, investigation, legal compliance or official record keeping.
                            </p>
                        </article>
                    )}

                    {/* SECTION 29 & 30 */}
                    {matchesSearch('Changes MatrixTrack Terms Features Modules Security Control Updates') && (
                        <article id="sec-29" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400 font-black text-sm">
                                    29-30
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">29 & 30. Changes to MatrixTrack and Terms</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may introduce, modify or improve features, modules, dashboards, reports, user interfaces or security controls. These Terms may also be updated due to changes in Platform functionality, security requirements, applicable law or operational processes.
                            </p>
                        </article>
                    )}

                    {/* SECTION 31 */}
                    {matchesSearch('Customer Agreement Contract Prevail Written Agreement Conflict') && (
                        <article id="sec-31" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    31
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">31. Customer Agreement</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Where a municipal corporation, ULB, government body, institution or other organization has a separate written agreement with MatrixTrack, that agreement will apply to the relevant contractual relationship. If these general Terms conflict with a specific written customer agreement, the written customer agreement will prevail to the extent of that conflict.
                            </p>
                        </article>
                    )}

                    {/* SECTION 32 */}
                    {matchesSearch('Governing Law Jurisdiction India Indore Madhya Pradesh Courts') && (
                        <article id="sec-32" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                                    32
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">32. Governing Law and Jurisdiction</h2>
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 text-sm text-slate-200 leading-relaxed">
                                These Terms will be governed by the laws of India. Subject to any separate contractual dispute-resolution mechanism, courts located at <strong>Indore, Madhya Pradesh, India</strong> will have jurisdiction to the extent permitted by applicable law.
                            </div>
                        </article>
                    )}

                    {/* SECTION 33 */}
                    {matchesSearch('Contact Information Apricity Digital Labs Pvt Limited info@apricitydigital.in') && (
                        <article id="sec-33" className="policy-card bg-gradient-to-br from-slate-800/80 to-indigo-950/40 border border-indigo-800/50 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-600/30">
                                    33
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">33. Contact Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                For questions regarding MatrixTrack 2.0 or these Terms, contact:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Platform</span>
                                    <strong className="text-white text-base">MatrixTrack 2.0</strong>
                                </div>

                                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Company</span>
                                    <strong className="text-white text-base">Apricity Digital Labs Pvt Limited</strong>
                                </div>

                                <div className="bg-slate-900/80 border border-indigo-500/40 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Privacy / Grievance Email</span>
                                    <a href="mailto:info@apricitydigital.in" className="text-indigo-400 hover:underline font-bold text-base block">
                                        info@apricitydigital.in
                                    </a>
                                </div>
                            </div>
                        </article>
                    )}

                    {/* OFFICIAL PLATFORM FOOTER BANNER */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                        <div className="inline-flex items-center gap-2 text-indigo-400 font-black text-lg tracking-wider">
                            <Shield size={20} /> MatrixTrack 2.0
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">
                            Workforce • Attendance • Inspections • Municipal Operations • Analytics • Performance Management
                        </p>
                        <div className="text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-900">
                            Operated by Apricity Digital Labs Pvt Ltd. • All Rights Reserved © 2026
                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
