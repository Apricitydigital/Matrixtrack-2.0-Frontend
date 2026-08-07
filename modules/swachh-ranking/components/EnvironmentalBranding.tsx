import React, {
    useEffect, useState, useRef, useCallback, useMemo
} from 'react';

/* ────────────────────────────────────────
   DYNAMIC CITY HELPER
──────────────────────────────────────── */
const getActiveCityName = (): string => {
    if (typeof window === 'undefined') return 'Indore';
    try {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.cityName) return parsed.cityName;
            if (parsed.city) return parsed.city;
        }
    } catch (e) {}
    return 'Indore';
};

const getCitySlogans = (city: string) => [
    `🌿 Clean ${city} Green ${city}`,
    `✨ Swachh ${city} Sundar ${city}`,
    `♻️ Waste Free ${city}`,
    `🏙️ Smart City ${city}`,
    `💚 Keep ${city} Beautiful`,
    `🤝 Together For A Cleaner ${city}`,
    `🌟 ${city.toUpperCase()} Cleanliness Mission`,
    `🌱 Green Today Better Tomorrow`,
];

type WeatherMode = 'spring' | 'clean_city' | 'monsoon' | 'festival';
type TimeOfDay  = 'morning' | 'afternoon' | 'evening' | 'night';

const WEATHER_POOL: (WeatherMode | null)[] = [
    'spring', 'clean_city', 'monsoon', 'festival',
    null, null, null, null, null,
];

const getTimeOfDay = (): TimeOfDay => {
    const h = new Date().getHours();
    if (h >= 6  && h < 12) return 'morning';
    if (h >= 12 && h < 17) return 'afternoon';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
};

const rnd = (min: number, max: number) => min + Math.random() * (max - min);

/* ────────────────────────────────────────
   WHEEL SVG (re-usable)
──────────────────────────────────────── */
const Wheel: React.FC<{ cx: number; cy: number; r?: number }> = ({ cx, cy, r = 11 }) => (
    <g className="train-wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        <circle cx={cx} cy={cy} r={r} fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r={r * 0.35} fill="#64748b" />
        {[0, 60, 120].map(a => (
            <line
                key={a}
                x1={cx} y1={cy}
                x2={cx + r * 0.82 * Math.cos(a * Math.PI / 180)}
                y2={cy + r * 0.82 * Math.sin(a * Math.PI / 180)}
                stroke="#94a3b8" strokeWidth="1.5"
            />
        ))}
    </g>
);

/* ────────────────────────────────────────
   COACH SVG
──────────────────────────────────────── */
interface CoachProps {
    x: number; w: number; color: string;
    accent: string; top: string; bottom: string;
    hasConnector: boolean; windowOpacity: number;
}
const Coach: React.FC<CoachProps> = ({
    x, w, color, accent, top, bottom, hasConnector, windowOpacity
}) => (
    <g>
        {hasConnector && (
            <rect x={x + w - 1} y={36} width={14} height={9} fill="#374151" rx="2" />
        )}
        {/* Shadow */}
        <rect x={x + 4} y={75} width={w - 8} height={8} rx="4"
            fill="rgba(0,0,0,0.18)" />
        {/* Body */}
        <rect x={x} y={10} width={w} height={62} rx="7" fill={color} />
        {/* Top stripe */}
        <rect x={x + 4} y={10} width={w - 8} height={5} rx="3"
            fill={`${accent}55`} />
        {/* Underbelly */}
        <rect x={x} y={65} width={w} height={7} rx="3"
            fill="rgba(0,0,0,0.2)" />
        {/* Windows */}
        {[x + 14, x + 14 + 40, x + 14 + 80].filter(wx => wx + 28 < x + w - 6).map((wx, wi) => (
            <g key={wi}>
                <rect x={wx} y={17} width={28} height={18} rx="4"
                    fill={`rgba(186,230,253,${windowOpacity})`}
                    stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                {/* Window glare */}
                <rect x={wx + 3} y={19} width={8} height={3} rx="2"
                    fill="rgba(255,255,255,0.25)" />
            </g>
        ))}
        {/* Main text */}
        <text x={x + w / 2} y={47} textAnchor="middle" fill="white"
            fontSize="12" fontWeight="800" letterSpacing="0.08em"
            style={{ fontFamily: 'system-ui, sans-serif' }}>
            {top}
        </text>
        <text x={x + w / 2} y={61} textAnchor="middle"
            fill="rgba(255,255,255,0.65)"
            fontSize="8.5" fontWeight="700" letterSpacing="0.14em"
            style={{ fontFamily: 'system-ui, sans-serif' }}>
            {bottom}
        </text>
        {/* Wheels */}
        <Wheel cx={x + 22} cy={78} />
        <Wheel cx={x + w - 22} cy={78} />
    </g>
);

/* ────────────────────────────────────────
   TRAIN SVG
──────────────────────────────────────── */
const TrainSVG: React.FC<{ isGolden: boolean }> = ({ isGolden }) => {
    const G = isGolden;
    const accent = '#f59e0b';
    const coachColors = G
        ? ['#78350f', '#92400e', '#b45309', '#d97706']
        : ['#14532d', '#166534', '#15803d', '#16a34a'];
    const engineBase   = G ? '#92400e' : '#1a4d2e';
    const engineAccent = G ? '#fde68a' : accent;
    const winAlpha     = G ? 0.38 : 0.26;
    const glowColor    = G ? 'rgba(245,158,11,0.65)' : 'rgba(20,160,77,0.35)';
    const smokeColor   = G ? 'rgba(245,158,11,0.55)' : 'rgba(100,116,139,0.55)';

    const activeCity = getActiveCityName();
    const upperCity = activeCity.toUpperCase();
    const mcCode = `${upperCity[0]}MC`;

    const coaches: { top: string; bottom: string }[] = [
        { top: 'SMART',  bottom: upperCity },
        { top: 'SWACHH', bottom: upperCity },
        { top: 'GREEN',  bottom: upperCity },
        { top: 'CLEAN',  bottom: upperCity },
    ];

    return (
        <svg
            viewBox="0 0 950 92"
            width="950"
            height="92"
            style={{
                display: 'block',
                filter: `drop-shadow(0 6px 14px rgba(0,0,0,0.38)) drop-shadow(0 0 8px ${glowColor})`,
            }}
        >
            {/* ── Ground track ── */}
            <rect x={0} y={83} width={950} height={3}  fill="#475569" rx="1" />
            <rect x={0} y={87} width={950} height={2}  fill="#64748b" rx="1" />
            {/* Ties */}
            {Array.from({ length: 17 }).map((_, i) => (
                <rect key={i} x={i * 56} y={81} width={34} height={9} rx="2"
                    fill="#78716c" opacity="0.65" />
            ))}

            {/* ── 4 Coaches (trailing, left side) ── */}
            {coaches.map((c, idx) => (
                <Coach
                    key={idx}
                    x={idx * 182}
                    w={172}
                    color={coachColors[3 - idx]}
                    accent={engineAccent}
                    top={c.top}
                    bottom={c.bottom}
                    hasConnector={idx < 3}
                    windowOpacity={winAlpha}
                />
            ))}

            {/* ── Connector: last coach → engine ── */}
            <rect x={726} y={36} width={14} height={9} fill="#374151" rx="2" />

            {/* ── Engine body ── */}
            <rect x={740} y={8} width={158} height={65} rx="8" fill={engineBase} />

            {/* Engine nose (sloped right) */}
            <path d="M898,8 L930,35 L930,45 L898,73 Z" fill={engineBase} />
            {/* Nose highlight streak */}
            <path d="M898,8 L930,35 L930,38 L901,10 Z"
                fill="rgba(255,255,255,0.1)" />

            {/* Engine undercar */}
            <rect x={740} y={73} width={190} height={8} rx="3"
                fill="rgba(0,0,0,0.22)" />

            {/* Engine shadow */}
            <rect x={744} y={78} width={186} height={8} rx="4"
                fill="rgba(0,0,0,0.18)" />

            {/* Accent stripe */}
            <rect x={740} y={36} width={160} height={5}
                fill={engineAccent} opacity="0.9" />

            {/* City MC logo badge */}
            <rect x={752} y={12} width={62} height={22} rx="5"
                fill={`rgba(255,255,255,${G ? 0.22 : 0.13})`} />
            <text x={783} y={27} textAnchor="middle"
                fill={engineAccent}
                fontSize="12" fontWeight="900" letterSpacing="0.06em"
                style={{ fontFamily: 'system-ui, sans-serif' }}>
                {mcCode}
            </text>

            {/* Engine label */}
            <text x={820} y={56} textAnchor="middle" fill="white"
                fontSize="8.5" fontWeight="700" letterSpacing="0.1em"
                style={{ fontFamily: 'system-ui, sans-serif' }}>
                {G ? '✦ GOLDEN EXPRESS' : `${upperCity} EXPRESS`}
            </text>

            {/* Windows */}
            {[820, 856].map((wx, wi) => (
                <g key={wi}>
                    <rect x={wx} y={13} width={28} height={18} rx="4"
                        fill={`rgba(186,230,253,${winAlpha})`}
                        stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                    <rect x={wx + 3} y={15} width={8} height={3} rx="2"
                        fill="rgba(255,255,255,0.25)" />
                </g>
            ))}

            {/* Horn */}
            <rect x={770} y={2} width={9} height={11} rx="2"
                fill={G ? '#d97706' : '#2d6a4f'} />
            <rect x={765} y={0} width={19} height={5} rx="2"
                fill={G ? '#b45309' : '#1a4d2e'} />

            {/* Smoke stack */}
            <rect x={750} y={1} width={9} height={10} rx="2"
                fill={G ? '#d97706' : '#166534'} />

            {/* Headlight glow */}
            <circle cx={927} cy={40} r={10}
                fill={G ? '#fde68a' : '#fef9c3'}
                style={{ filter: `blur(1.5px) drop-shadow(0 0 8px ${G ? '#f59e0b' : '#fef08a'})` }}
            />
            <circle cx={927} cy={40} r={5} fill="white" />

            {/* Engine wheels */}
            <Wheel cx={760} cy={78} r={13} />
            <Wheel cx={814} cy={78} r={13} />
            <Wheel cx={876} cy={78} r={11} />

            {/* Smoke particles */}
            {[
                { cx: 754, r: 5,  delay: '0s' },
                { cx: 754, r: 7,  delay: '0.65s' },
                { cx: 754, r: 4,  delay: '1.3s' },
            ].map((s, i) => (
                <circle key={i} cx={s.cx} cy={6} r={s.r}
                    fill={smokeColor}
                    className="train-smoke"
                    style={{ animationDelay: s.delay }}
                />
            ))}

            {/* Golden sparkles */}
            {G && [
                { x: 760, y: 5 }, { x: 820, y: 3 }, { x: 880, y: 6 },
                { x: 930, y: 20 }, { x: 748, y: 45 }
            ].map((p, i) => (
                <text key={i} x={p.x} y={p.y} fontSize="9"
                    style={{ animation: `festivalBlink ${0.8 + i * 0.3}s ${i * 0.2}s ease-in-out infinite` }}>
                    ✦
                </text>
            ))}
        </svg>
    );
};

/* ────────────────────────────────────────
   TRAIN ANIMATION WRAPPER
──────────────────────────────────────── */
const CityTrainAnimation: React.FC<{ isGolden: boolean; slogan: string }> = ({
    isGolden, slogan
}) => (
    <div className="pune-train-container" aria-hidden="true">
        <div className="pune-train-wrapper">
            <div style={{ position: 'relative' }}>
                <span className={`pune-train-slogan${isGolden ? ' golden' : ''}`}>
                    {isGolden ? '🏆 ' : ''}{slogan}
                </span>
            </div>
            <TrainSVG isGolden={isGolden} />
        </div>
    </div>
);

/* ────────────────────────────────────────
   TIME OF DAY OVERLAY
──────────────────────────────────────── */
const TimeOfDayOverlay: React.FC<{ tod: TimeOfDay }> = ({ tod }) => {
    if (tod === 'afternoon') return null;
    return <div className={`environmental-tod-overlay tod-${tod}`} aria-hidden="true" />;
};

/* ────────────────────────────────────────
   MICRO ANIMATIONS (LEAVES & RAIN & FIREWORKS)
──────────────────────────────────────── */
const MicroAnimations: React.FC = () => {
    return null;
};

/* ────────────────────────────────────────
   WEATHER EFFECT
──────────────────────────────────────── */
const WeatherEffect: React.FC<{ mode: WeatherMode }> = ({ mode }) => {
    if (mode === 'monsoon') {
        return (
            <div className="environmental-weather-layer" aria-hidden="true">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div
                        key={i}
                        className="rain-drop"
                        style={{
                            left: `${rnd(2, 98)}%`,
                            animationDuration: `${rnd(0.6, 1.1)}s`,
                            animationDelay: `${rnd(0, 1.5)}s`,
                        }}
                    />
                ))}
            </div>
        );
    }
    return null;
};

/* ────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────── */
export const EnvironmentalBranding: React.FC = () => {
    const [trainVisible, setTrainVisible] = useState(false);
    const [isGolden, setIsGolden]         = useState(false);
    const [slogan, setSlogan]             = useState<string>('');
    const [trainKey, setTrainKey]         = useState(0);
    const [weatherMode, setWeatherMode]   = useState<WeatherMode | null>(null);
    const [timeOfDay, setTimeOfDay]       = useState<TimeOfDay>('afternoon');

    const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeCity = getActiveCityName();
    const citySlogans = useMemo(() => getCitySlogans(activeCity), [activeCity]);

    const spawnTrain = useCallback(() => {
        const golden = Math.random() < 0.15;
        const s      = citySlogans[Math.floor(Math.random() * citySlogans.length)];
        setIsGolden(golden);
        setSlogan(s);
        setTrainKey(k => k + 1);
        setTrainVisible(true);

        setTimeout(() => setTrainVisible(false), 24000);
    }, [citySlogans]);

    const scheduleTrain = useCallback(() => {
        const nextDelay = rnd(25, 45) * 1000;
        scheduleRef.current = setTimeout(() => {
            spawnTrain();
            scheduleTrain();
        }, nextDelay);
    }, [spawnTrain]);

    useEffect(() => {
        const first = setTimeout(() => spawnTrain(), 4000);
        scheduleTrain();

        const onKey = (e: KeyboardEvent) => {
            if (e.shiftKey && e.key === 'T') spawnTrain();
        };
        window.addEventListener('keydown', onKey);

        return () => {
            clearTimeout(first);
            if (scheduleRef.current) clearTimeout(scheduleRef.current);
            window.removeEventListener('keydown', onKey);
        };
    }, [spawnTrain, scheduleTrain]);

    useEffect(() => {
        const t = setInterval(() => setTimeOfDay(getTimeOfDay()), 60000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        const t = setInterval(() => {
            const mode = WEATHER_POOL[Math.floor(Math.random() * WEATHER_POOL.length)];
            setWeatherMode(mode);
            if (mode) setTimeout(() => setWeatherMode(null), 35000);
        }, 12 * 60 * 1000);
        return () => clearInterval(t);
    }, []);

    return null;
};

export default EnvironmentalBranding;
