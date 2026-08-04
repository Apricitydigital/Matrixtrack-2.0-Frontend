import pmcLogo from '../assets/pmc-logo.png';

interface PmcLogoProps {
    size?: number;
    showText?: boolean;
    direction?: 'row' | 'column';
}

const getActiveCity = (): { name: string; hindi: string; code: string } => {
    if (typeof window === 'undefined') return { name: 'Indore', hindi: 'इन्दौर नगर निगम', code: 'IMC' };
    try {
        const stored = localStorage.getItem('user');
        if (stored) {
            const parsed = JSON.parse(stored);
            const name = parsed.cityName || parsed.city || 'Indore';
            const upper = name.toUpperCase();
            let hindi = `${name} नगर निगम`;
            if (upper.includes('INDORE')) hindi = 'इन्दौर नगर निगम';
            else if (upper.includes('BHOPAL')) hindi = 'भोपाल नगर निगम';
            else if (upper.includes('UJJAIN')) hindi = 'उज्जैन नगर निगम';
            else if (upper.includes('GWALIOR')) hindi = 'ग्वालियर नगर निगम';
            return { name, hindi, code: `${upper[0]}MC` };
        }
    } catch (e) { }
    return { name: 'Indore', hindi: 'इन्दौर नगर निगम', code: 'IMC' };
};

const PmcLogo = ({ size = 56, showText = true, direction = 'row' }: PmcLogoProps) => {
    const isRow = direction === 'row';
    const cityInfo = getActiveCity();
    const logoSrc = (pmcLogo as any)?.src || pmcLogo;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: direction,
                alignItems: 'center',
                gap: isRow ? '0.75rem' : '0.35rem',
                textAlign: isRow ? 'left' : 'center'
            }}
        >
            <img
                src={logoSrc}
                alt={`${cityInfo.name} Municipal Corporation logo`}
                style={{
                    width: size,
                    height: size,
                    objectFit: 'contain'
                }}
            />
            {showText && (
                <div className="pmc-logo-text" style={{ lineHeight: 1.2 }}>
                    <span style={{ display: 'block', fontWeight: 800, color: '#d97706', fontSize: 12 }}>
                        {cityInfo.hindi}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                        {cityInfo.name} Municipal Corporation
                    </span>
                </div>
            )}
        </div>
    );
};

export default PmcLogo;
