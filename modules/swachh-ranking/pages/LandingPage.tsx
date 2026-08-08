import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
    Users, School, Activity, Building2, Store, Home, Hotel,
    Calendar, Trophy, MapPin, ArrowRight, ShieldCheck,
    CheckCircle2, X
} from 'lucide-react';
import PmcLogo from '../components/PmcLogo';
import ParticipantCategorySections from '../components/ParticipantCategorySections';
import {
    createCitizenDetails,
    createHotelDetails,
    createHospitalDetails,
    createMarketDetails,
    createOfficeDetails,
    createSchoolDetails,
    createSocietyDetails,
    createWardDetails
} from '../constants/participantForms';

import SwachhParvLogo from '../assets/swachh-parv-logo.png';

type HeroLanguage = 'mr' | 'en';

const HERO_COPY: Record<HeroLanguage, string[]> = {
    mr: [
        'पुणे शहराच्या सर्वांगीण विकासाच्या वाटचालीत “पुण्याचे प्रगतीपर्व” अंतर्गत स्वच्छता पर्व पुरस्कार – २०२६ ही एक महत्त्वाकांक्षी आणि जनसहभागावर आधारित स्पर्धा सुरू करण्यात आली आहे. “स्वच्छ पुणे संकल्प – २०२६” या ध्येयाला प्रत्यक्षात उतरविण्यासाठी पुणे महानगरपालिका नागरिक, संस्था आणि विविध घटकांना एकत्र आणत आहे.',
        'या स्पर्धेचा उद्देश केवळ स्वच्छता राखणे एवढाच नसून, शहरात शाश्वत स्वच्छता व्यवस्थापनाची मजबूत प्रणाली निर्माण करणे हा आहे. कचरा निर्मिती कमी करणे, ओला-सुका कचरा योग्य पद्धतीने वेगळा करणे, सिंगल यूज प्लास्टिकचा वापर बंद करणे, सार्वजनिक व सामुदायिक स्वच्छतागृहांची देखभाल सुधारणे, तसेच परिसर सुशोभिकरण या सर्व बाबींमध्ये उत्कृष्ट कामगिरी करणाऱ्या घटकांना सन्मानित करण्यात येणार आहे.',
        'या उपक्रमात शाळा, महाविद्यालये, रुग्णालये, हॉटेल्स, बाजारपेठा, गृहनिर्माण संस्था, सरकारी कार्यालये आणि सर्व प्रभागांचा समावेश असेल. निश्चित निकषांनुसार मूल्यांकन करण्यात येईल आणि उत्कृष्ट कामगिरी करणाऱ्यांना पुरस्कार प्रदान केले जातील.',
        'ही स्पर्धा म्हणजे केवळ पुरस्कार जिंकण्याची संधी नसून, स्वच्छ, सुंदर आणि पर्यावरणपूरक पुणे घडविण्याची सामूहिक जबाबदारी स्वीकारण्याचे व्यासपीठ आहे.',
        'चला, आपण सर्वजण मिळून “स्वच्छ पुणे संकल्प – २०२६” साकार करूया!'
    ],
    en: [
        'Under Pune’s developmental initiative “Punyache Pragati Parv,” the Swachhata Parv Puraskar – 2026 has been launched as a special, citizen-driven competition aimed at transforming the vision of “Swachh Pune Sankalp – 2026” into reality.',
        'This initiative by the Pune Municipal Corporation seeks to promote not just cleanliness, but a sustainable and structured sanitation system across the city. The objective is to encourage waste reduction at source, proper segregation of wet and dry waste, elimination of single-use plastic, improvement of public and community toilet maintenance, and enhancement of overall area beautification.',
        'The competition will include participation from schools, colleges, hospitals, hotels, markets, housing societies, government offices, and all wards of the city. Evaluation will be conducted based on defined cleanliness and sanitation parameters, and top-performing stakeholders will be recognized and awarded.',
        'More than a competition, this is a movement to build a cleaner, greener, and more sustainable Pune through collective action and civic responsibility.',
        'Let us come together to turn the vision of “Swachh Pune Sankalp – 2026” into a proud reality.'
    ]
};

const READ_MORE_LABELS: Record<HeroLanguage, { more: string; less: string }> = {
    mr: { more: 'अधिक वाचा', less: 'कमी दाखवा' },
    en: { more: 'Read More', less: 'Show Less' }
};

type DetailRecord = Record<string, any>;

type OptionalFieldRule = string[] | ((details: DetailRecord) => string[]);

const OPTIONAL_DETAIL_FIELDS: Record<string, OptionalFieldRule> = {
    markets: ['associationHeadName', 'associationHeadContact'],
    citizen_puraskar: (details) => {
        if (!details.type) {
            return ['officeAddress', 'directorName', 'yearOfEstablishment'];
        }
        if (details.type === 'NGO') {
            return ['yearOfEstablishment'];
        }
        return ['officeAddress', 'directorName'];
    }
};

const resolveOptionalFields = (role: string, details: DetailRecord): string[] => {
    const config = OPTIONAL_DETAIL_FIELDS[role];
    if (!config) return [];
    return typeof config === 'function' ? config(details) : config;
};

const hasMeaningfulValue = (value: unknown): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value === 'boolean') return true;
    return true;
};

const humanizeFieldLabel = (key: string): string => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const sanitizeDetailPayload = (details: DetailRecord): DetailRecord => {
    return Object.entries(details).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' ? value.trim() : value;
        return acc;
    }, {} as DetailRecord);
};

const getMissingDetailFields = (role: string, details: DetailRecord): string[] => {
    const optionalFields = resolveOptionalFields(role, details);
    return Object.entries(details)
        .filter(([key]) => !optionalFields.includes(key))
        .filter(([, value]) => !hasMeaningfulValue(value))
        .map(([key]) => humanizeFieldLabel(key));
};

const getIsMobileViewport = () => (typeof window !== 'undefined' ? window.innerWidth < 768 : false);

const LandingPage = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [role, setRole] = useState('');
    const [loading, setLoading] = useState(false);
    const [officeDetails, setOfficeDetails] = useState(createOfficeDetails);
    const [societyDetails, setSocietyDetails] = useState(createSocietyDetails);
    const [hospitalDetails, setHospitalDetails] = useState(createHospitalDetails);
    const [wardDetails, setWardDetails] = useState(createWardDetails);
    const [hotelDetails, setHotelDetails] = useState(createHotelDetails);
    const [schoolDetails, setSchoolDetails] = useState(createSchoolDetails);
    const [marketDetails, setMarketDetails] = useState(createMarketDetails);
    const [citizenDetails, setCitizenDetails] = useState(createCitizenDetails);

    const categoryStates = {
        offices: { value: officeDetails, onChange: setOfficeDetails },
        societies: { value: societyDetails, onChange: setSocietyDetails },
        hospitals: { value: hospitalDetails, onChange: setHospitalDetails },
        wards: { value: wardDetails, onChange: setWardDetails },
        hotels: { value: hotelDetails, onChange: setHotelDetails },
        schools: { value: schoolDetails, onChange: setSchoolDetails },
        markets: { value: marketDetails, onChange: setMarketDetails },
        citizen: { value: citizenDetails, onChange: setCitizenDetails }
    };
    const [heroLanguage, setHeroLanguage] = useState<HeroLanguage>('mr');
    const [isHeroExpanded, setIsHeroExpanded] = useState(false);
    const [isHeroMobile, setIsHeroMobile] = useState(getIsMobileViewport);

    const stakeholders = [
        { name: 'Wards', value: 'wards', icon: <MapPin size={32} />, color: '#1a4d2e' },
        { name: 'Schools', value: 'schools', icon: <School size={32} />, color: '#1a4d2e' },
        { name: 'Hospitals', value: 'hospitals', icon: <Activity size={32} />, color: '#1a4d2e' },
        { name: 'Offices', value: 'offices', icon: <Building2 size={32} />, color: '#1a4d2e' },
        { name: 'Markets', value: 'markets', icon: <Store size={32} />, color: '#1a4d2e' },
        { name: 'Societies - BWG', value: 'societies - bwg', icon: <Users size={32} />, color: '#1a4d2e' },
        { name: 'Hotel / Restaurant', value: 'hotels', icon: <Hotel size={32} />, color: '#1a4d2e' },
        { name: 'Citizen / Citizen Groups / Other Organizations', value: 'citizen_puraskar', icon: <ShieldCheck size={32} />, color: '#1a4d2e' },
    ];

    const timeline = [
        { id: 1, activity: 'Launch of competition', date: '19 Feb 2026' },
        { id: 2, activity: 'Assessment application launch', date: '19 Feb 2026' },
        { id: 3, activity: 'Baseline Survey', date: '01 March to 31 March 2026' },
        { id: 4, activity: 'Preparation period', date: '01 April to 31 April 2026' },

        { id: 5, activity: 'Assessment', date: 'May to September (Every Month)' },
    ];

    const categories = [
        { type: 'Ward Ranking', marks: 6500 },
        { type: 'School Ranking', marks: 250 },
        { type: 'Hotel Ranking', marks: 100 },
        { type: 'Societies (BWG) Ranking', marks: 200 },
    ];

    const getPrimaryContactForRole = () => {
        switch (role) {
            case 'offices':
                return officeDetails.inchargeContact;
            case 'societies - bwg':
                return societyDetails.chairmanContact;
            case 'hospitals':
                return hospitalDetails.adminContact;
            case 'wards':
                return wardDetails.officerContact;
            case 'hotels':
                return hotelDetails.inchargeContact;
            case 'schools':
                return schoolDetails.principalContact;
            case 'markets':
                return marketDetails.inchargeSIContact || marketDetails.associationHeadContact;
            case 'citizen_puraskar':
                return citizenDetails.phoneNumber;
            default:
                return '';
        }
    };

    const handleParticipation = () => {
        setLoading(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setLoading(false);
                setStep(2);
            }, (error) => {
                alert("Please enable location to participate in the competition.");
                setLoading(false);
            });
        }
    };

    const handleRegistration = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!role) {
            alert("Please select a participation category.");
            return;
        }

        if (!location) {
            alert("Location details missing. Please enable location access and try again.");
            setStep(1);
            return;
        }

        const contactFieldValue = getPrimaryContactForRole() || '';
        const primaryContact = contactFieldValue.replace(/\D/g, '');
        if (primaryContact.length !== 10) {
            alert("Please enter a valid 10-digit contact number for the selected category.");
            return;
        }

        let puraskarPayload: DetailRecord = { ...citizenDetails };
        if (role === 'citizen_puraskar') {
            if (!citizenDetails.name.trim()) {
                alert("Please enter the organization or citizen group name.");
                return;
            }
            if (!citizenDetails.wardName.trim()) {
                alert("Please select the ward name.");
                return;
            }
            if (!citizenDetails.type) {
                alert("Please select the participant type.");
                return;
            }
            if (!citizenDetails.detailsOfWork.trim()) {
                alert("Please describe the details of work.");
                return;
            }

            if (citizenDetails.type === 'NGO') {
                if (!citizenDetails.officeAddress.trim()) {
                    alert("Office address is required for NGOs.");
                    return;
                }
                if (!citizenDetails.directorName.trim()) {
                    alert("Director name is required for NGOs.");
                    return;
                }
                puraskarPayload = {
                    ...citizenDetails,
                    phoneNumber: citizenDetails.phoneNumber.trim(),
                    detailsOfWork: citizenDetails.detailsOfWork.trim(),
                    officeAddress: citizenDetails.officeAddress.trim(),
                    directorName: citizenDetails.directorName.trim(),
                    yearOfEstablishment: undefined
                };
            } else {
                if (!citizenDetails.yearOfEstablishment.trim()) {
                    alert("Year of establishment is required for this type.");
                    return;
                }
                const parsedYear = Number(citizenDetails.yearOfEstablishment);
                if (Number.isNaN(parsedYear)) {
                    alert("Please provide a valid year of establishment.");
                    return;
                }
                puraskarPayload = {
                    ...citizenDetails,
                    phoneNumber: citizenDetails.phoneNumber.trim(),
                    detailsOfWork: citizenDetails.detailsOfWork.trim(),
                    yearOfEstablishment: parsedYear,
                    officeAddress: citizenDetails.officeAddress?.trim() || undefined,
                    directorName: citizenDetails.directorName?.trim() || undefined
                };
            }
        }

        let rawDetails: DetailRecord;
        switch (role) {
            case 'offices':
                rawDetails = officeDetails;
                break;
            case 'societies - bwg':
                rawDetails = societyDetails;
                break;
            case 'hospitals':
                rawDetails = hospitalDetails;
                break;
            case 'wards':
                rawDetails = wardDetails;
                break;
            case 'hotels':
                rawDetails = hotelDetails;
                break;
            case 'schools':
                rawDetails = schoolDetails;
                break;
            case 'markets':
                rawDetails = marketDetails;
                break;
            case 'citizen_puraskar':
                rawDetails = puraskarPayload;
                break;
            default:
                alert("Please select a valid participation category.");
                return;
        }

        const preparedDetails = sanitizeDetailPayload(rawDetails);
        const missingFields = getMissingDetailFields(role, preparedDetails);

        if (missingFields.length > 0) {
            alert(`Please complete all form details: ${missingFields.join(', ')}`);
            return;
        }

        setLoading(true);

        try {
            console.log("✅ Registering participation with:", { role, primaryContact, location, details: preparedDetails });

            await api.post('/participation/register', {
                category: role,
                mobileNumber: primaryContact,
                locationLat: location.lat,
                locationLng: location.lng,
                details: preparedDetails
            });

            console.log("🎯 Registration successful!");
            setStep(3); // Move to success view

        } catch (error: any) {
            console.error("⚠️ Error while registering participation:", error);
            const errorMsg = error.response?.data?.message || error.message || "Registration failed";
            alert(`Error: ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => setIsHeroMobile(getIsMobileViewport());
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        setIsHeroExpanded(false);
    }, [heroLanguage, isHeroMobile]);

    const heroParagraphs = HERO_COPY[heroLanguage];
    const heroVisibleParagraphs = isHeroMobile && !isHeroExpanded ? heroParagraphs.slice(0, 1) : heroParagraphs;
    const heroCopyClass = [
        'hero-intro__copy',
        'hero-intro__copy--active',
        isHeroMobile && !isHeroExpanded ? 'is-collapsed' : ''
    ]
        .filter(Boolean)
        .join(' ');
    const heroToggleLabel = READ_MORE_LABELS[heroLanguage][isHeroExpanded ? 'less' : 'more'];
    const showHeroReadMore = isHeroMobile && heroParagraphs.length > 1;


    return (
        <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'var(--font-main)' }}>
            {/* Header / Navbar */}
            {/* <nav style={{
                backgroundColor: 'var(--swachh-green)',
                padding: '1rem 5%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 100
            }}>
                <PmcLogo size={72} />

                <div className="header-actions">
                    <Link
                        to="/"
                        aria-label="Swachh Pune home"
                        className="header-logo-link"
                        style={{ textDecoration: 'none' }}
                    >
                        <img
                            src={SwachhParvLogo}
                            alt="Swachh Pune Sankalp 2026"
                            className="header-logo"
                        />
                    </Link>
                    <Link to="/unified-login" style={{ color: 'white', fontWeight: 600, textDecoration: 'none', fontSize: '0.9375rem', opacity: 0.9 }}>Portal Login</Link>
                    <button
                        onClick={() => { setShowModal(true); setStep(1); }}
                        className="btn"
                        style={{ backgroundColor: 'var(--swachh-accent)', color: 'var(--swachh-green)', fontWeight: 800, padding: '0.6rem 1.4rem', border: 'none' }}
                    >
                        Participate Now
                    </button>
                </div>
            </nav> */}
            <nav className="main-navbar">
                <div className="nav-left">
                    <PmcLogo size={72} />
                </div>

                <div className="header-actions">
                    <Link
                        to="/"
                        aria-label="Swachh Pune home"
                        className="header-logo-link"
                    >
                        <img
                            src={typeof SwachhParvLogo === 'string' ? SwachhParvLogo : (SwachhParvLogo as any)?.src || (SwachhParvLogo as any)}
                            alt="Swachh Pune Sankalp 2026"
                            className="header-logo"
                        />
                    </Link>

                    <Link to="/unified-login" className="portal-link">
                        Portal Login
                    </Link>

                    <button
                        onClick={() => { setShowModal(true); setStep(1); }}
                        className="participate-btn"
                    >
                        Participate Now
                    </button>
                </div>
            </nav>
            {/* Hero Section */}
            <section className="hero-intro">
                <div className="hero-intro__inner">
                    <h1 className="hero-intro__title">✨ स्वच्छता पर्व पुरस्कार २०२६ ✨</h1>

                    <div className="hero-intro__toggle" role="group" aria-label="Language selector">
                        <button
                            type="button"
                            className={`hero-intro__toggle-btn ${heroLanguage === 'mr' ? 'is-active' : ''}`}
                            onClick={() => setHeroLanguage('mr')}
                            aria-pressed={heroLanguage === 'mr'}
                        >
                            मराठी
                        </button>
                        <span className="hero-intro__toggle-divider">|</span>
                        <button
                            type="button"
                            className={`hero-intro__toggle-btn ${heroLanguage === 'en' ? 'is-active' : ''}`}
                            onClick={() => setHeroLanguage('en')}
                            aria-pressed={heroLanguage === 'en'}
                        >
                            ENG
                        </button>
                    </div>

                    <div className="hero-intro__copy-wrapper">
                        <div key={heroLanguage} className={heroCopyClass}>
                            {heroVisibleParagraphs.map((paragraph, idx) => (
                                <p key={`${heroLanguage}-${idx}`}>{paragraph}</p>
                            ))}
                        </div>
                    </div>

                    {showHeroReadMore && (
                        <button
                            type="button"
                            className="hero-intro__readmore"
                            onClick={() => setIsHeroExpanded((prev) => !prev)}
                        >
                            {heroToggleLabel}
                        </button>
                    )}
                </div>
            </section>

            {/* Stakeholders Section */}
            <section style={{ padding: 'clamp(3rem, 8vw, 5rem) 5%', textAlign: 'center' }}>
                <h2 style={{ fontSize: 'clamp(1.75rem, 6vw, 2.5rem)', fontWeight: 850, marginBottom: 'clamp(1.5rem, 4vw, 3rem)', color: 'var(--swachh-green)' }}>STAKEHOLDERS LIST</h2>
                <div style={{ width: '100%', overflowX: 'auto', paddingBottom: '1rem' }}>
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'stretch',
                        gap: '1.5rem',
                        flexWrap: 'nowrap',
                        minWidth: 'max-content',
                        padding: '0 1rem'
                    }}>
                        {stakeholders.map((s, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '1rem',
                                width: '210px',
                                minWidth: '210px'
                            }}>
                                <div style={{
                                    width: '96px',
                                    height: '96px',
                                    borderRadius: '50%',
                                    border: `4px solid ${s.color}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: s.color,
                                    backgroundColor: 'white',
                                    boxShadow: '0 8px 16px rgba(0,0,0,0.05)'
                                }}>
                                    {s.icon}
                                </div>
                                <div style={{
                                    backgroundColor: s.color,
                                    color: 'white',
                                    padding: '0.7rem 1rem',
                                    borderRadius: '12px 12px 0 0',
                                    fontWeight: 700,
                                    fontSize: '0.9rem',
                                    width: '100%',
                                    textAlign: 'center'
                                }}>
                                    {s.name}
                                </div>
                                <button
                                    onClick={() => {
                                        setRole(s.value);
                                        setShowModal(true);
                                        setStep(1);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '0.6rem',
                                        backgroundColor: 'var(--swachh-accent)',
                                        color: 'var(--swachh-green)',
                                        border: 'none',
                                        borderRadius: '0 0 12px 12px',
                                        fontWeight: 800,
                                        fontSize: '0.75rem',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}
                                >
                                    Participate
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Timeline & Categories Section */}
            <section className="results-section">
                {/* Timeline */}
                <div>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 850, marginBottom: '2.5rem', color: 'var(--swachh-green)', textAlign: 'center' }}>COMPETITION TIMELINE</h2>
                    <div className="table-wrapper">
                        <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--swachh-green)', color: 'white' }}>
                                    <th style={{ padding: '1.25rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Sr No.</th>
                                    <th style={{ padding: '1.25rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Activity</th>
                                    <th style={{ padding: '1.25rem', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>Timeline</th>
                                </tr>
                            </thead>
                            <tbody>
                                {timeline.map((t, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', fontWeight: 600, color: 'var(--swachh-green)' }}>{t.id}</td>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', fontWeight: 700 }}>{t.activity}</td>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', color: 'var(--swachh-green-light)', fontWeight: 600 }}>{t.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Categories */}

                <div>
                    <h2 style={{ fontSize: '2.25rem', fontWeight: 850, marginBottom: '2.5rem', color: 'var(--swachh-green)', textAlign: 'center' }}>ASSESSMENT CATEGORIES</h2>
                    <div className="table-wrapper">
                        <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ backgroundColor: 'var(--swachh-green)', color: 'white' }}>
                                    <th style={{ padding: '1.25rem', textAlign: 'left' }}>Sr No.</th>
                                    <th style={{ padding: '1.25rem', textAlign: 'left' }}>Assessment Type</th>
                                    <th style={{ padding: '1.25rem', textAlign: 'left' }}>Max Marks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { id: 1, type: 'Ward Ranking', marks: 6500 },
                                    { id: 2, type: 'School Ranking', marks: 250 },
                                    { id: 3, type: 'Hotel Ranking', marks: 100 },
                                    { id: 4, type: 'Office Ranking', marks: 150 },
                                    { id: 5, type: 'Market Ranking', marks: 150 },
                                    { id: 6, type: 'Societies (BWG)', marks: 200 },
                                    { id: 7, type: 'Hospitals', marks: 100 },
                                ].map((c, idx) => (
                                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', fontWeight: 600, color: 'var(--swachh-green)' }}>{c.id}</td>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', fontWeight: 700 }}>{c.type}</td>
                                        <td style={{ padding: '1.25rem', borderBottom: '1px solid #edf2f7', fontWeight: 800, color: '#92400e' }}>{c.marks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="result-banner">
                        RESULT PORTAL LAUNCHES SOON BY ADMINISTRATION
                    </div>
                </div>
            </section>

            {/* Participation Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem'
                }}>
                    <div className="card shadow-premium" style={{ width: '100%', maxWidth: '500px', position: 'relative', border: 'none', maxHeight: '90vh', overflowY: 'auto' }}>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{
                                position: 'absolute',
                                right: '1.5rem',
                                top: '1.5rem',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            <X size={24} />
                        </button>

                        <div className="landing-modal-inner" style={{ padding: "3rem" }}>
                            {step === 1 && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: '64px',
                                        height: '64px',
                                        backgroundColor: 'rgba(26, 77, 46, 0.1)',
                                        color: 'var(--swachh-green)',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 1.5rem'
                                    }}>
                                        <MapPin size={32} />
                                    </div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>Location Verification</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                                        To participate in the competition, we need to verify your geographical coordinates.
                                    </p>
                                    <button
                                        onClick={handleParticipation}
                                        className="btn btn-primary"
                                        style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--swachh-green)' }}
                                        disabled={loading}
                                    >
                                        {loading ? 'Obtaining Coordinates...' : 'Enable Location & Continue'}
                                    </button>
                                </div>
                            )}

                            {step === 2 && (
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Participant Details</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9375rem' }}>
                                        Coordinates Captured: <span style={{ color: 'var(--swachh-green-light)', fontWeight: 700 }}>{location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}</span>
                                    </p>
                                    <form onSubmit={handleRegistration}>
                                        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                                            <label>Select Your Category</label>
                                            <select
                                                required
                                                value={role}
                                                onChange={(e) => setRole(e.target.value)}
                                            >
                                                <option value="">Choose your role...</option>
                                                {stakeholders.map((s, i) => <option key={i} value={s.value}>{s.name}</option>)}
                                            </select>
                                        </div>
                                        <ParticipantCategorySections
                                            role={role}
                                            states={categoryStates}
                                            disabled={false}
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: '1rem', backgroundColor: 'var(--swachh-green)' }}
                                            disabled={loading}
                                        >
                                            {loading ? 'Submitting...' : 'Submit Registration'}
                                        </button>
                                    </form>
                                </div>
                            )}

                            {step === 3 && (
                                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        backgroundColor: '#dcfce7',
                                        color: '#16a34a',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 2rem',
                                        boxShadow: '0 0 0 10px #f0fdf4'
                                    }}>
                                        <CheckCircle2 size={40} />
                                    </div>
                                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '1.25rem', color: 'var(--swachh-green)', lineHeight: 1.2 }}>
                                        Registration Successful
                                    </h2>
                                    <div style={{
                                        backgroundColor: 'var(--swachh-accent)',
                                        color: 'var(--swachh-green)',
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        marginBottom: '2.5rem',
                                        fontWeight: 800,
                                        fontSize: '1.125rem'
                                    }}>
                                        Swachh-Parv Participation Details Saved
                                    </div>
                                    <p style={{ color: 'var(--text-secondary)', marginBottom: '3rem', fontSize: '1rem', lineHeight: 1.6 }}>
                                        Your submission has been recorded successfully. Our assessment team will be in touch soon.
                                    </p>
                                    <button
                                        onClick={() => {
                                            setShowModal(false);
                                            setStep(1);
                                            setRole('');
                                        }}
                                        className="btn btn-primary"
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            backgroundColor: 'var(--swachh-green)',
                                            fontWeight: 800,
                                            border: 'none'
                                        }}
                                    >
                                        Close & Return
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer style={{ backgroundColor: 'var(--swachh-green)', color: 'white', padding: '4rem 5%', textAlign: 'center' }}>
                <p style={{ opacity: 0.7, fontSize: '0.875rem' }}>© 2026 Pune Municipal Corporation - Swachh Pune Mission. All rights reserved.</p>
                <p style={{ opacity: 0.85, fontSize: '0.85rem', marginTop: '0.5rem' }}>Design &amp; Development by Apricity Digital Labs Private Limited</p>
                <p style={{ marginTop: '1rem', fontSize: '0.8rem' }}>
                    <Link to="/support-policy" style={{ color: 'rgba(255,255,255,0.75)', textDecoration: 'underline' }}>
                        Support Policy
                    </Link>
                </p>
            </footer>
        </div>
    );
};

export default LandingPage;
