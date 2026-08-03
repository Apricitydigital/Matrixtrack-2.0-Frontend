interface NoAccessProps {
    title?: string;
    message?: string;
}

const NoAccess = ({
    title = 'Restricted Module',
    message = 'You do not have permission to view this module. Please contact your administrator.'
}: NoAccessProps) => {
    return (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', border: '1px dashed var(--border)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                {title}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                {message}
            </p>
        </div>
    );
};

export default NoAccess;
