'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Shield,
    ShieldCheck,
    ArrowLeft,
    Search,
    Printer,
    Lock,
    FileText,
    Mail,
    Building2,
    CheckCircle2,
    Calendar,
    Layers,
    MapPin,
    Camera,
    Bot,
    HardDrive,
    Users,
    Eye,
    Share2,
    Server,
    UserCheck,
    AlertTriangle,
    Cookie,
    Scale,
    RefreshCw,
    Phone,
    BookOpen
} from 'lucide-react';

export default function PrivacyPolicyPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<string | null>(null);

    const handlePrint = () => {
        if (typeof window !== 'undefined') {
            window.print();
        }
    };

    const sections = [
        { id: 'sec-1', number: '1', title: 'Scope' },
        { id: 'sec-2', number: '2', title: 'Information We May Collect' },
        { id: 'sec-3', number: '3', title: 'Account and Login Information' },
        { id: 'sec-4', number: '4', title: 'Attendance Information' },
        { id: 'sec-5', number: '5', title: 'Location Information' },
        { id: 'sec-6', number: '6', title: 'Photographs and Field Evidence' },
        { id: 'sec-8', number: '8', title: 'Inspection and Operational Information' },
        { id: 'sec-9', number: '9', title: 'Performance and Analytics Information' },
        { id: 'sec-10', number: '10', title: 'AI-Assisted Features' },
        { id: 'sec-11', number: '11', title: 'Device and Technical Information' },
        { id: 'sec-12', number: '12', title: 'How We Use Information' },
        { id: 'sec-13', number: '13', title: 'Role-Based Access to Information' },
        { id: 'sec-14', number: '14', title: 'Sharing of Information' },
        { id: 'sec-15', number: '15', title: 'Third-Party Services' },
        { id: 'sec-16', number: '16', title: 'Data Security' },
        { id: 'sec-17', number: '17', title: 'Data Retention' },
        { id: 'sec-18', number: '18', title: 'User Privacy Rights' },
        { id: 'sec-19', number: '19', title: 'User Responsibilities' },
        { id: 'sec-20', number: '20', title: 'Children’s Privacy' },
        { id: 'sec-21', number: '21', title: 'Cookies and Session Technologies' },
        { id: 'sec-22', number: '22', title: 'Security Incidents and Data Breaches' },
        { id: 'sec-23', number: '23', title: 'Applicable Data-Protection Law' },
        { id: 'sec-24', number: '24', title: 'Changes to this Privacy Policy' },
        { id: 'sec-25', number: '25', title: 'Contact and Grievance Details' },
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
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/30">
                            <Shield size={18} />
                        </div>
                        <div>
                            <span className="text-sm font-black text-white tracking-tight leading-none block">
                                MatrixTrack 2.0
                            </span>
                            <span className="text-[10px] font-semibold text-blue-400 leading-none">
                                Privacy & Data Governance
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
                            placeholder="Search policy sections..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-slate-800/90 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
                        />
                    </div>

                    <button
                        onClick={handlePrint}
                        type="button"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20"
                    >
                        <Printer size={14} /> Print Policy
                    </button>
                </div>
            </header>

            {/* HERO BANNER */}
            <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 py-12 px-4 sm:px-8">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

                <div className="max-w-5xl mx-auto relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold mb-4 uppercase tracking-widest">
                        <ShieldCheck size={14} /> Official Governance Document
                    </div>

                    <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
                        MATRIXTRACK 2.0 PRIVACY POLICY
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-400 mb-6">
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <Calendar size={13} className="text-blue-400" /> Effective Date: <strong className="text-white">2 September 2026</strong>
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <RefreshCw size={13} className="text-emerald-400" /> Last Updated: <strong className="text-white">2 September 2026</strong>
                        </span>
                        <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                            <Building2 size={13} className="text-violet-400" /> Operator: <strong className="text-white">Apricity Digital Labs Pvt Ltd</strong>
                        </span>
                    </div>

                    <p className="max-w-3xl mx-auto text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
                        This Privacy Policy explains how MatrixTrack 2.0 (“MatrixTrack”, “Platform”, “we”, “us” or “our”), operated by Apricity Digital Labs Pvt Ltd , collects, uses, stores, processes, shares and protects information when users access or use the MatrixTrack 2.0 website, web portal, mobile application, dashboards, APIs and related services.
                    </p>

                    <div className="mt-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-800/40 max-w-3xl mx-auto text-left text-xs sm:text-sm text-slate-300 leading-relaxed">
                        <p className="mb-2">
                            MatrixTrack 2.0 is a workforce, attendance, inspection, municipal operations, field monitoring, reporting and performance-management platform used by authorized organizations such as Urban Local Bodies (“ULBs”), municipal corporations, government bodies, institutions and other organizations.
                        </p>
                        <p className="font-semibold text-blue-200">
                            By accessing or using MatrixTrack 2.0, users acknowledge that their information may be processed in accordance with this Privacy Policy, applicable organizational policies and applicable law.
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
                            <BookOpen size={15} className="text-blue-400" /> Table of Contents
                        </div>

                        <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1 text-xs custom-scrollbar">
                            {sections.map((sec) => (
                                <button
                                    key={sec.id}
                                    onClick={() => scrollToSection(sec.id)}
                                    type="button"
                                    className={`w-full text-left px-3 py-2 rounded-xl transition flex items-center gap-2.5 font-medium ${activeSection === sec.id
                                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
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
                    {matchesSearch('Scope Commissioners City Administrators ULB Officers Action Officers Quality Control Supervisors Employees') && (
                        <article id="sec-1" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    1
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">1. Scope</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                This Privacy Policy applies to all authorized users of MatrixTrack 2.0, including, where applicable:
                            </p>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                                {[
                                    'Commissioners',
                                    'City Administrators',
                                    'ULB Officers',
                                    'IEC Members',
                                    'Sanitary Inspectors',
                                    'Darogas',
                                    'Employees'
                                ].map((role) => (
                                    <li key={role} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                                        <span>{role}</span>
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs text-slate-400 italic pt-2">
                                The information available to each user depends on their assigned role and access permissions.
                            </p>
                        </article>
                    )}

                    {/* SECTION 2 */}
                    {matchesSearch('Information We May Collect Personal Employee Name ID Supervisor Designation Department Agency Organization Email Mobile City Zone Ward Area Beat Shift') && (
                        <article id="sec-2" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                                    2
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">2. Information We May Collect</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                The information collected depends on the MatrixTrack modules and functionality enabled by the relevant organization.
                            </p>

                            <div className="space-y-3">
                                <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                                    <UserCheck size={16} /> 2.1 Personal and Employee Information
                                </h3>
                                <p className="text-sm text-slate-300">We may process information such as:</p>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                    {[
                                        'Name',
                                        'Employee/User ID',
                                        'Employee code',
                                        'Daroga details',
                                        'Designation',
                                        'Department',
                                        'Agency',
                                        'Organization',
                                        'Email address',
                                        'Mobile number',
                                        'Assigned role',
                                        'City',
                                        'Zone',
                                        'Ward',
                                        'Area',
                                        'Beat',
                                        'Shift or work assignment'
                                    ].map((item) => (
                                        <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg font-medium text-slate-200">
                                            • {item}
                                        </div>
                                    ))}
                                </div>

                                <p className="text-xs text-slate-400 pt-2">
                                    Where required and lawfully configured by an organization, additional identification information may also be processed.
                                </p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 3 */}
                    {matchesSearch('Account Login Information Password Mobile Email Authentication IP Session Logs') && (
                        <article id="sec-3" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 font-black text-sm">
                                    3
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">3. Account and Login Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack 2.0 allows authorized users to log in using either:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-violet-800/40 text-center font-bold text-violet-200 text-xs sm:text-sm">
                                    Registered Email Address + Password
                                </div>
                                <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-violet-800/40 text-center font-bold text-violet-200 text-xs sm:text-sm">
                                    Registered Mobile Number + Password
                                </div>
                            </div>

                            <p className="text-sm text-slate-300">
                                MatrixTrack may process account and authentication-related information required to verify the user and maintain secure access to the Platform. This may include:
                            </p>

                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Registered email address',
                                    'Registered mobile number',
                                    'Authentication credentials',
                                    'Login date and time',
                                    'Session information',
                                    'Failed login attempts',
                                    'IP address',
                                    'Device information',
                                    'Security and audit logs'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                                <p className="font-bold text-white">Security Notice:</p>
                                <p>Users are responsible for keeping their passwords confidential.</p>
                                <p>Passwords and authentication credentials should be stored and handled through appropriate security mechanisms and must not intentionally be made available in readable form to unauthorized persons.</p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 4 */}
                    {matchesSearch('Attendance Check-in Check-out shift work location ward history analytics') && (
                        <article id="sec-4" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    4
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">4. Attendance Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Where attendance functionality is enabled, MatrixTrack may process:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Attendance date',
                                    'Check-in and check-out information',
                                    'Attendance status',
                                    'Employee ID',
                                    'Assigned shift',
                                    'Work location',
                                    'Daroga or ward assignment',
                                    'Attendance history',
                                    'Uploaded attendance records',
                                    'Related attendance analytics'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                Attendance information may be used for workforce monitoring, operational reporting and organizational administration.
                            </p>
                        </article>
                    )}

                    {/* SECTION 5 */}
                    {matchesSearch('Location background location device field presence inspection ward beat asset verification fraud') && (
                        <article id="sec-5" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    5
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">5. Location Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Certain MatrixTrack features may require access to device location. Location information may be used for:
                            </p>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                                {[
                                    'Attendance verification',
                                    'Field presence verification',
                                    'Inspection location verification',
                                    'Assigned ward, area or beat verification',
                                    'Asset or facility verification',
                                    'Field-task monitoring',
                                    'Prevention of fraudulent submissions',
                                    'Operational reporting'
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <MapPin size={15} className="text-blue-400 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                                <p>Location access will depend on the functionality enabled and permissions available on the user’s device.</p>
                                <p className="text-slate-400">Where background location functionality is used, it should be enabled only where required for an authorized operational purpose and appropriately disclosed.</p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 6 */}
                    {matchesSearch('Photographs Field Evidence Toilet Litter Bin Sweeping Beat Inspection Action Required Action Taken Metadata') && (
                        <article id="sec-6" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-black text-sm">
                                    6
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">6. Photographs and Field Evidence</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may allow or require users to capture and upload photographs or other evidence relating to:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                                {[
                                    'Attendance',
                                    'Sweeping work',
                                    'Toilet inspections',
                                    'Litter Bin inspections',
                                    'Beat inspections',
                                    'Field assignments',
                                    'Quality-control activities',
                                    'Action Required / Taken'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg font-medium text-slate-200 text-center">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-sm text-slate-300">
                                Uploaded photographs may be associated with: Date, Time, User, Employee, Location, Inspection, Asset, Ward, Zone, Beat, and other relevant metadata.
                            </p>

                            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-800/30 text-xs text-rose-200">
                                <strong>User Guideline:</strong> Users should upload only evidence relevant to their assigned work and should avoid intentionally capturing unrelated individuals or confidential information.
                            </div>
                        </article>
                    )}

                    {/* SECTION 8 */}
                    {matchesSearch('Inspection Operational Information Beat Toilet Litter Bin Sweeping Taskforce QC Action Required Action Taken Scores KPIs') && (
                        <article id="sec-8" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-black text-sm">
                                    8
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">8. Inspection and Operational Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may process operational information including:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Assigned inspections',
                                    'Completed inspections',
                                    'Inspection date and time',
                                    'Inspection photographs',
                                    'Inspection remarks',
                                    'Registered assets',
                                    'Beats',
                                    'Toilets',
                                    'Litter Bins',
                                    'Sweeping records',
                                    'Taskforce records',
                                    'SI status',
                                    'Approved records',
                                    'Rejected records',
                                    'Action Required records',
                                    'Action Taken records',
                                    'Daroga remarks',
                                    'ULB Officer remarks',
                                    'SI remarks',
                                    'Operational scores and KPIs'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 9 */}
                    {matchesSearch('Performance Analytics Percentage Trends Ward rankings KPI Dashboard') && (
                        <article id="sec-9" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-sm">
                                    9
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">9. Performance and Analytics Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may generate operational analytics including:
                            </p>

                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Attendance percentage',
                                    'Attendance trends',
                                    'Inspection completion percentage',
                                    'Expected vs. actual inspections',
                                    'Approved reports',
                                    'Rejected reports',
                                    'Action Required cases',
                                    'Action Taken cases',
                                    'Daroga performance',
                                    'Employee performance',
                                    'Zone performance',
                                    'Ward performance',
                                    'Module performance',
                                    'Ward rankings',
                                    'Inspection scores',
                                    'Dashboard KPIs'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs text-slate-400">
                                These analytics are designed to support operational monitoring and authorized organizational decision-making.
                            </p>
                        </article>
                    )}

                    {/* SECTION 10 */}
                    {matchesSearch('AI-Assisted Features Automated Photo evidence analysis Anomaly Recommendations Insights Quality') && (
                        <article id="sec-10" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-black text-sm">
                                    10
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">10. AI-Assisted Features</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Certain MatrixTrack functionality may use automated systems or AI-assisted tools to provide:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                                {[
                                    'Inspection analysis',
                                    'Photo/evidence analysis',
                                    'Recommendations',
                                    'Suggested actions',
                                    'Anomaly identification',
                                    'Operational prioritization',
                                    'Report summaries',
                                    'Quality-related insights'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg font-medium text-slate-200 text-center">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-fuchsia-950/30 border border-fuchsia-800/40 text-xs text-fuchsia-200 leading-relaxed">
                                <strong>Governance Rule:</strong> AI-generated information is intended to assist authorized users and should not automatically be treated as a final disciplinary, employment, administrative or legal decision without appropriate review where such review is required.
                            </div>
                        </article>
                    )}

                    {/* SECTION 11 */}
                    {matchesSearch('Device Technical Information OS Application version IP Browser Error logs') && (
                        <article id="sec-11" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400 font-black text-sm">
                                    11
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">11. Device and Technical Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                For security, troubleshooting and Platform operation, MatrixTrack may automatically collect technical information such as:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Device type',
                                    'Operating system',
                                    'Application version',
                                    'Browser information',
                                    'IP address',
                                    'Login/session information',
                                    'Error logs',
                                    'Application logs',
                                    'Security events',
                                    'Authentication records'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 12 */}
                    {matchesSearch('How We Use Information Authenticate Role-based access Dashboards Security Fraud support') && (
                        <article id="sec-12" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    12
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">12. How We Use Information</h2>
                            </div>

                            <p className="text-sm text-slate-300">Information may be processed to:</p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                                {[
                                    'Create and manage user accounts',
                                    'Authenticate users',
                                    'Provide role-based access',
                                    'Maintain workforce information',
                                    'Verify field activity',
                                    'Manage zones, wards, areas and beats',
                                    'Conduct and monitor inspections',
                                    'Maintain photo evidence',
                                    'Operate SI workflows',
                                    'Manage Action Required and Action Taken workflows',
                                    'Generate dashboards',
                                    'Generate operational analytics',
                                    'Measure employee and daroga performance',
                                    'Generate ward and zone rankings',
                                    'Detect suspected fraud or misuse',
                                    'Protect Platform security',
                                    'Provide technical support',
                                    'Comply with applicable legal requirements'
                                ].map((item) => (
                                    <div key={item} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                                        <span>{item}</span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    )}

                    {/* SECTION 13 */}
                    {matchesSearch('Role-Based Access Controls Scope Authorization Administrative') && (
                        <article id="sec-13" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-sm">
                                    13
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">13. Role-Based Access to Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack uses role-based access controls. Information visible to a user may depend on their:
                            </p>

                            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                                {['Role', 'City', 'Module', 'Zone', 'Ward', 'Area', 'Beat', 'Assigned responsibilities'].map((tag) => (
                                    <span key={tag} className="px-3 py-1.5 rounded-xl bg-orange-950/30 border border-orange-800/40 text-orange-200 font-bold">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed pt-2">
                                Authorized administrators and officials may access information necessary to perform their official responsibilities. Users must not attempt to access information outside their authorized scope.
                            </p>
                        </article>
                    )}

                    {/* SECTION 14 */}
                    {matchesSearch('Sharing of Information ULBs Municipal Cloud Advertising Third Parties') && (
                        <article id="sec-14" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-sm">
                                    14
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">14. Sharing of Information</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Information may be shared, where necessary, with:
                            </p>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                {[
                                    'The organization using MatrixTrack',
                                    'Municipal corporations',
                                    'ULBs',
                                    'Authorized government departments',
                                    'Authorized administrators',
                                    'Darogas',
                                    'SI personnel',
                                    'ULB Officers',
                                    'IEC Members',
                                    'Authorized technology/service providers',
                                    'Cloud infrastructure providers',
                                    'Storage providers',
                                    'Security providers',
                                    'Auditors or professional advisers',
                                    'Government, regulatory, judicial or law-enforcement authorities where legally required'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs font-bold text-emerald-300">
                                No Data Selling Guarantee: MatrixTrack does not intend to sell workforce personal information to unrelated third parties for their independent advertising or marketing purposes.
                            </div>
                        </article>
                    )}

                    {/* SECTION 15 */}
                    {matchesSearch('Third-Party Services Hosting Cloud storage Mapping location Notifications Security Identity Analytics') && (
                        <article id="sec-15" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-black text-sm">
                                    15
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">15. Third-Party Services</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack may use third-party technology or infrastructure services for purposes such as:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Hosting',
                                    'Cloud storage',
                                    'Authentication',
                                    'Mapping/location functionality',
                                    'Notifications',
                                    'Security',
                                    'Identity verification',
                                    'Analytics',
                                    'Other Platform integrations'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                Information shared with such providers should be limited to what is reasonably required to provide the relevant functionality.
                            </p>
                        </article>
                    )}

                    {/* SECTION 16 */}
                    {matchesSearch('Data Security Safeguards Encryption Password Role-based Access Logging Audit Cloud') && (
                        <article id="sec-16" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 font-black text-sm">
                                    16
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">16. Data Security</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack uses reasonable technical, administrative and organizational safeguards designed to protect information. These may include:
                            </p>

                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Password-based authentication',
                                    'Role-based access control',
                                    'Restricted administrative access',
                                    'Secure network communication',
                                    'Activity logging',
                                    'Security monitoring',
                                    'Access controls',
                                    'Cloud infrastructure security',
                                    'Backup mechanisms',
                                    'Audit trails'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs text-slate-400 italic">
                                However, no electronic system can guarantee absolute security. Users are also responsible for protecting their passwords, devices and account credentials.
                            </p>
                        </article>
                    )}

                    {/* SECTION 17 */}
                    {matchesSearch('Data Retention Retention Policy Deletion Disabling attendance government records') && (
                        <article id="sec-17" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-black text-sm">
                                    17
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">17. Data Retention</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Information may be retained for as long as reasonably necessary for:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                {[
                                    'Providing MatrixTrack services',
                                    'Attendance records',
                                    'Inspection records',
                                    'Government or organizational record keeping',
                                    'SI workflows',
                                    'Action Required / Action Taken workflows',
                                    'Audit requirements',
                                    'Security investigations',
                                    'Dispute resolution',
                                    'Contractual requirements',
                                    'Compliance with applicable law'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 space-y-1">
                                <p>When information is no longer reasonably required, it may be securely deleted, anonymized or otherwise handled according to the applicable retention policy.</p>
                                <p className="text-purple-300 font-medium">Disabling or deleting a user account does not necessarily require deletion of official attendance, inspection, audit or government records that must lawfully or operationally be retained.</p>
                            </div>
                        </article>
                    )}

                    {/* SECTION 18 */}
                    {matchesSearch('User Privacy Rights Correction Erasure Access Grievance Redressal Employer ULB') && (
                        <article id="sec-18" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    18
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">18. User Privacy Rights</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                Subject to applicable law and the circumstances in which information is processed, users may be able to request:
                            </p>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-slate-200">
                                {[
                                    'Access to information regarding processing of their personal data',
                                    'Correction of inaccurate information',
                                    'Updating of information',
                                    'Completion of incomplete information',
                                    'Erasure of information where legally permitted',
                                    'Withdrawal of consent where processing is based on consent',
                                    'Grievance redressal',
                                    'Other rights available under applicable data-protection law'
                                ].map((item) => (
                                    <li key={item} className="flex items-center gap-2 bg-slate-900/60 border border-slate-700/50 p-2.5 rounded-xl">
                                        <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>

                            <p className="text-xs text-slate-400 leading-relaxed pt-2">
                                Where employee information is controlled by the user’s employer, municipality, ULB or other organization, the request may need to be submitted through that organization. Certain information may continue to be retained where required for government records, attendance records, audits, investigations, legal obligations or legitimate organizational requirements.
                            </p>
                        </article>
                    )}

                    {/* SECTION 19 */}
                    {matchesSearch('User Responsibilities Accurate credentials impersonate location evidence') && (
                        <article id="sec-19" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-sm">
                                    19
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">19. User Responsibilities</h2>
                            </div>

                            <p className="text-sm text-slate-300">Users must:</p>

                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                                {[
                                    'Provide accurate information',
                                    'Use only their authorized account',
                                    'Keep passwords confidential',
                                    'Not share login credentials',
                                    'Not impersonate another employee',
                                    'Not manipulate location information',
                                    'Not submit false inspection evidence',
                                    'Not disclose employee information to unauthorized persons',
                                    'Use information accessed through MatrixTrack only for authorized purposes'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    )}

                    {/* SECTION 20 */}
                    {matchesSearch('Children Privacy Workforce Government institutional administrative') && (
                        <article id="sec-20" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 font-black text-sm">
                                    20
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">20. Children’s Privacy</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack 2.0 is intended primarily for authorized workforce, government, institutional and administrative use and is not intended as a consumer service for children.
                            </p>

                            <p className="text-xs text-slate-400">
                                Organizations must ensure that users registered for workforce functionality meet applicable legal and organizational requirements.
                            </p>
                        </article>
                    )}

                    {/* SECTION 21 */}
                    {matchesSearch('Cookies Session Technologies Tokens Browser storage Login security') && (
                        <article id="sec-21" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-black text-sm">
                                    21
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">21. Cookies and Session Technologies</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                MatrixTrack web applications may use:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-300">
                                {['Cookies', 'Browser storage', 'Authentication tokens', 'Session technologies'].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-center text-slate-200">
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                These may be required for login, authentication, security, session management and Platform functionality.
                            </p>
                        </article>
                    )}

                    {/* SECTION 22 */}
                    {matchesSearch('Security Incidents Data Breaches Investigate Contain Restore Report') && (
                        <article id="sec-22" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 font-black text-sm">
                                    22
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">22. Security Incidents and Data Breaches</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                If a security incident involving personal information occurs, MatrixTrack may take appropriate steps to:
                            </p>

                            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'Investigate the incident',
                                    'Contain the incident',
                                    'Protect affected systems',
                                    'Restore services',
                                    'Cooperate with the relevant organization',
                                    'Make notifications where required under applicable law'
                                ].map((item) => (
                                    <li key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </li>
                                ))}
                            </ul>

                            <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-800/40 text-xs text-red-200 font-medium">
                                Users should immediately report suspected unauthorized access or account compromise.
                            </div>
                        </article>
                    )}

                    {/* SECTION 23 */}
                    {matchesSearch('Applicable Data Protection Law Indian DPDP Digital Personal Data Protection Act 2023') && (
                        <article id="sec-23" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-sm">
                                    23
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">23. Applicable Data-Protection Law</h2>
                            </div>

                            <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-800/40 text-sm text-slate-200 leading-relaxed">
                                MatrixTrack intends to process personal information in accordance with applicable Indian law, including the <strong>Digital Personal Data Protection Act, 2023</strong>, rules framed under it and other applicable requirements, to the extent such provisions are in force and apply to the relevant processing activity.
                            </div>
                        </article>
                    )}

                    {/* SECTION 24 */}
                    {matchesSearch('Changes Privacy Policy Functionality Security Practices Legal Requirements') && (
                        <article id="sec-24" className="policy-card bg-slate-800/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-slate-500/10 border border-slate-500/30 flex items-center justify-center text-slate-400 font-black text-sm">
                                    24
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">24. Changes to this Privacy Policy</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                We may update this Privacy Policy to reflect changes in:
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-300">
                                {[
                                    'MatrixTrack functionality',
                                    'Security practices',
                                    'Legal requirements',
                                    'Organizational requirements',
                                    'Technology or integrations'
                                ].map((item) => (
                                    <div key={item} className="bg-slate-900/60 border border-slate-700/40 px-3 py-2 rounded-lg text-slate-200">
                                        • {item}
                                    </div>
                                ))}
                            </div>

                            <p className="text-xs text-slate-400">
                                The latest version will display its effective or last updated date.
                            </p>
                        </article>
                    )}

                    {/* SECTION 25 */}
                    {matchesSearch('Contact Grievance Details Platform MatrixTrack 2.0 Company Apricity Digital Labs Pvt Ltd info@apricitydigital.in') && (
                        <article id="sec-25" className="policy-card bg-gradient-to-br from-slate-800/80 to-blue-950/40 border border-blue-800/50 rounded-3xl p-6 sm:p-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-600/30">
                                    25
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-white">25. Contact and Grievance Details</h2>
                            </div>

                            <p className="text-sm text-slate-300 leading-relaxed">
                                For privacy questions, requests or grievances, contact:
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs sm:text-sm">
                                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Platform</span>
                                    <strong className="text-white text-base">MatrixTrack 2.0</strong>
                                </div>

                                <div className="bg-slate-900/80 border border-slate-700/60 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Company</span>
                                    <strong className="text-white text-base">Apricity Digital Labs Pvt Ltd.</strong>
                                </div>

                                <div className="bg-slate-900/80 border border-blue-500/40 p-4 rounded-2xl space-y-1">
                                    <span className="text-slate-400 text-xs block">Support Email</span>
                                    <a href="mailto:info@apricitydigital.in" className="text-blue-400 hover:underline font-bold text-base block">
                                        info@apricitydigital.in
                                    </a>
                                </div>
                            </div>

                            <p className="text-xs text-slate-400 leading-relaxed pt-2">
                                Where the information is controlled by a municipal corporation, ULB, government body or another customer organization, users may also contact the designated official of that organization.
                            </p>
                        </article>
                    )}

                    {/* OFFICIAL PLATFORM FOOTER BANNER */}
                    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-8 text-center space-y-3">
                        <div className="inline-flex items-center gap-2 text-blue-400 font-black text-lg tracking-wider">
                            <Shield size={20} /> MatrixTrack 2.0
                        </div>
                        <p className="text-xs sm:text-sm font-semibold text-slate-400 tracking-wide">
                            Workforce • Attendance • Inspections • Operations • Analytics • Performance Management
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
