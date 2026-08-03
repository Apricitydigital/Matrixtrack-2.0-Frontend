// import React, { useState, useEffect } from 'react';
// import api from '../api/axios';
// import { Camera, Save, User as UserIcon, Mail, Phone, Info, CheckCircle } from 'lucide-react';

// const Profile = () => {
//     const [user, setUser] = useState<any>(() => {
//         const userString = localStorage.getItem('user');
//         return userString ? JSON.parse(userString) : null;
//     });
//     const [loading, setLoading] = useState(false);
//     const [saving, setSaving] = useState(false);
//     const [message, setMessage] = useState({ type: '', text: '' });
//     const [previewImage, setPreviewImage] = useState<string | null>(null);
//     const [selectedFile, setSelectedFile] = useState<File | null>(null);

//     const [formData, setFormData] = useState({
//         name: '',
//         email: '',
//         mobileNumber: '',
//         bio: ''
//     });

//     useEffect(() => {
//         fetchProfile();
//     }, []);

//     const fetchProfile = async () => {
//         try {
//             const token = localStorage.getItem('token');
//             const response = await api.get('/users/profile', {
//                 headers: { Authorization: `Bearer ${token}` }
//             });
//             setUser(response.data);
//             setFormData({
//                 name: response.data.name || '',
//                 email: response.data.email || '',
//                 mobileNumber: response.data.mobileNumber || '',
//                 bio: response.data.bio || ''
//             });
//             if (response.data.profileImage) {
//                 setPreviewImage(`${import.meta.env.VITE_API_BASE_URL}${response.data.profileImage}`);
//             }
//         } catch (err) {
//             console.error('Failed to fetch profile', err);
//         } finally {
//             setLoading(false);
//         }
//     };

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
//         setFormData({ ...formData, [e.target.name]: e.target.value });
//     };

//     const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         if (e.target.files && e.target.files[0]) {
//             const file = e.target.files[0];
//             setSelectedFile(file);
//             setPreviewImage(URL.createObjectURL(file));
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         setSaving(true);
//         setMessage({ type: '', text: '' });

//         try {
//             const token = localStorage.getItem('token');
//             const data = new FormData();
//             data.append('name', formData.name);
//             data.append('email', formData.email);
//             data.append('mobileNumber', formData.mobileNumber);
//             data.append('bio', formData.bio);
//             if (selectedFile) {
//                 data.append('profileImage', selectedFile);
//             }

//             const response = await api.put('/users/profile', data, {
//                 headers: {
//                     Authorization: `Bearer ${token}`,
//                     'Content-Type': 'multipart/form-data'
//                 }
//             });

//             // Update local storage user data
//             const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
//             const updatedUser = { ...currentUser, ...response.data };
//             localStorage.setItem('user', JSON.stringify(updatedUser));

//             setUser(response.data);
//             setMessage({ type: 'success', text: 'Profile updated successfully!' });

//             // Trigger storage event for other components to update
//             window.dispatchEvent(new Event('storage'));

//         } catch (err: any) {
//             console.error('Update failed', err);
//             setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
//         } finally {
//             setSaving(false);
//         }
//     };

//     if (loading) return (
//         <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
//             <div className="spinner"></div>
//         </div>
//     );

//     return (
//         <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
//             <div className="card shadow-premium" style={{ padding: '3rem', border: 'none', borderRadius: '24px' }}>
//                 <div style={{ marginBottom: '3rem' }}>
//                     <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Account Settings</h1>
//                     <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Manage your personal information and profile picture.</p>
//                 </div>

//                 <form onSubmit={handleSubmit}>
//                     {/* Profile Image Section */}
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', marginBottom: '4rem' }}>
//                         <div style={{ position: 'relative' }}>
//                             <div style={{
//                                 width: '120px',
//                                 height: '120px',
//                                 borderRadius: '32px',
//                                 backgroundColor: 'var(--primary-soft)',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 overflow: 'hidden',
//                                 border: '4px solid white',
//                                 boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
//                             }}>
//                                 {previewImage ? (
//                                     <img src={previewImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
//                                 ) : (
//                                     <UserIcon size={48} color="var(--primary)" />
//                                 )}
//                             </div>
//                             <label style={{
//                                 position: 'absolute',
//                                 bottom: '-10px',
//                                 right: '-10px',
//                                 width: '40px',
//                                 height: '40px',
//                                 borderRadius: '12px',
//                                 backgroundColor: 'var(--swachh-green)',
//                                 color: 'white',
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 justifyContent: 'center',
//                                 cursor: 'pointer',
//                                 border: '3px solid white',
//                                 boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
//                             }}>
//                                 <Camera size={18} />
//                                 <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
//                             </label>
//                         </div>
//                         <div>
//                             <h4 style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Profile Photo</h4>
//                             <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0' }}>JPG, WebP or PNG. Max 5MB.</p>
//                         </div>
//                     </div>

//                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
//                         <div className="form-group">
//                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
//                                 <UserIcon size={16} /> Full Name
//                             </label>
//                             <input
//                                 type="text"
//                                 className="form-control"
//                                 name="name"
//                                 value={formData.name}
//                                 onChange={handleInputChange}
//                                 style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
//                                 required
//                             />
//                         </div>
//                         <div className="form-group">
//                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
//                                 <Mail size={16} /> Email Address
//                             </label>
//                             <input
//                                 type="email"
//                                 className="form-control"
//                                 name="email"
//                                 value={formData.email}
//                                 onChange={handleInputChange}
//                                 style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
//                                 required
//                             />
//                         </div>
//                         <div className="form-group">
//                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
//                                 <Phone size={16} /> Mobile Number
//                             </label>
//                             <input
//                                 type="text"
//                                 className="form-control"
//                                 name="mobileNumber"
//                                 value={formData.mobileNumber}
//                                 onChange={handleInputChange}
//                                 style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
//                                 required
//                             />
//                         </div>
//                         <div className="form-group">
//                             <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
//                                 <Info size={16} /> System Role
//                             </label>
//                             <input
//                                 type="text"
//                                 className="form-control"
//                                 value={(user?.role || JSON.parse(localStorage.getItem('user') || '{}').role || 'USER').toUpperCase()}
//                                 disabled
//                                 style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#3730a3' }}
//                             />
//                         </div>
//                     </div>

//                     <div className="form-group" style={{ marginBottom: '3rem' }}>
//                         <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
//                             <Info size={16} /> Bio / Description
//                         </label>
//                         <textarea
//                             className="form-control"
//                             name="bio"
//                             rows={4}
//                             value={formData.bio}
//                             onChange={handleInputChange}
//                             placeholder="Tell us about yourself..."
//                             style={{ padding: '1.25rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 500, resize: 'none' }}
//                         ></textarea>
//                     </div>

//                     {message.text && (
//                         <div style={{
//                             padding: '1.25rem',
//                             borderRadius: '16px',
//                             backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
//                             color: message.type === 'success' ? '#059669' : '#dc2626',
//                             marginBottom: '2rem',
//                             display: 'flex',
//                             alignItems: 'center',
//                             gap: '0.75rem',
//                             fontWeight: 700
//                         }}>
//                             {message.type === 'success' ? <CheckCircle size={20} /> : <Info size={20} />}
//                             {message.text}
//                         </div>
//                     )}

//                     <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
//                         <button
//                             type="submit"
//                             className="btn btn-primary"
//                             disabled={saving}
//                             style={{
//                                 padding: '1.25rem 3rem',
//                                 borderRadius: '16px',
//                                 fontSize: '1rem',
//                                 fontWeight: 800,
//                                 display: 'flex',
//                                 alignItems: 'center',
//                                 gap: '0.75rem',
//                                 boxShadow: '0 8px 16px var(--primary-soft)'
//                             }}
//                         >
//                             {saving ? 'Saving...' : <><Save size={20} /> Save Changes</>}
//                         </button>
//                     </div>
//                 </form>
//             </div>
//         </div>
//     );
// };

// export default Profile;

import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Camera, Save, User as UserIcon, Mail, Phone, Info, CheckCircle } from 'lucide-react';
import NoAccess from '../components/NoAccess';
import { hasPermission } from '../utils/accessControl';

const Profile = () => {
    const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
    const canViewProfile = hasPermission(currentUser?.permissions, 'my_profile', 'view');
    const canEditProfile = hasPermission(currentUser?.permissions, 'my_profile', 'write');

    if (!currentUser || !canViewProfile) {
        return <NoAccess title="My Profile" message="You do not have permission to view profile details." />;
    }
    const [user, setUser] = useState<any>(() => {
        const userString = localStorage.getItem('user');
        return userString ? JSON.parse(userString) : null;
    });
    const [imageVersion, setImageVersion] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        mobileNumber: '',
        bio: ''
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await api.get('/users/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUser(response.data);
            setFormData({
                name: response.data.name || '',
                email: response.data.email || '',
                mobileNumber: response.data.mobileNumber || '',
                bio: response.data.bio || ''
            });
            if (response.data.profileImage) {
                const apiBase = ((import.meta as any).env?.VITE_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000') as string;
                setPreviewImage(`${apiBase.replace(/\/+$/, '')}${response.data.profileImage}`);
            }
        } catch (err) {
            console.error('Failed to fetch profile', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!canEditProfile) return;
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEditProfile) return;

    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];

        // ⭐ 5MB validation
        if (file.size > 5 * 1024 * 1024) {
            setMessage({
                type: "error",
                text: "Image size must be less than 5MB"
            });
            return;
        }

        setSelectedFile(file);
        setPreviewImage(URL.createObjectURL(file));
        setMessage({ type: "", text: "" });
    }
};

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canEditProfile) {
            alert('Write permission required to update profile.');
            return;
        }
        setSaving(true);
        setMessage({ type: '', text: '' });
  

        try {
            const token = localStorage.getItem('token');
            const data = new FormData();
            data.append('name', formData.name);
            data.append('email', formData.email);
            data.append('mobileNumber', formData.mobileNumber);
            data.append('bio', formData.bio);
            if (selectedFile) data.append('profileImage', selectedFile);

            const response = await api.put('/users/profile', data, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setImageVersion(Date.now());
setSelectedFile(null);

            const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
            const updatedUser = { ...currentUser, ...response.data };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(response.data);
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            // window.dispatchEvent(new Event('storage'));
            window.dispatchEvent(new Event('userUpdated'));
        } catch (err: any) {
            console.error('Update failed', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}>
            <div className="spinner"></div>
        </div>
    );

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <div className="card shadow-premium" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', border: 'none', borderRadius: '24px' }}>
                
                {/* Header */}
                <div style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Account Settings
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                        Manage your personal information and profile picture.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>

                    {/* Profile Image Section */}
                    <div className="profile-image-section" style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{
                                width: '110px', height: '110px',
                                borderRadius: '28px',
                                backgroundColor: 'var(--primary-soft)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                overflow: 'hidden',
                                border: '4px solid white',
                                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                            }}>
                                {previewImage ? (
<img
 src={
  previewImage?.startsWith("blob:")
    ? previewImage
    : previewImage + "?v=" + imageVersion
}
  alt="Profile"
  style={{ width: "100%", height: "100%", objectFit: "cover" }}
/>                                ) : (
                                    <UserIcon size={44} color="var(--primary)" />
                                )}
                            </div>
                            <label
  style={{
    position: "absolute",
    bottom: "-10px",
    right: "-10px",
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    backgroundColor: "var(--swachh-green)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: canEditProfile ? "pointer" : "not-allowed",
    border: "3px solid white",
    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
    opacity: canEditProfile ? 1 : 0.6
  }}
>
  <Camera size={18} />

  <input
    type="file"
    aria-label="Upload profile photo"
    accept="image/*"
    onChange={handleFileChange}
    disabled={!canEditProfile}
    style={{
      position: "absolute",
      inset: 0,
      opacity: 0,
      cursor: "pointer"
    }}
  />
</label>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Profile Photo</h4>
                            <p style={{ fontSize: '0.875rem', color: '#4b5563' }}>JPG, WebP or PNG. Max 5MB.</p>
                        </div>
                    </div>

                    {/* Form Grid — 2 col desktop, 1 col mobile */}
                    <div className="two-column-grid" style={{ marginBottom: '2rem' }}>
                        <div className="form-group">
                            <label htmlFor="profile-name" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                <UserIcon size={16} /> Full Name
                            </label>
                            <input
                                id="profile-name"
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
                                required
                            disabled={!canEditProfile}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-email" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                <Mail size={16} /> Email Address
                            </label>
                            <input
                                id="profile-email"
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
                                required
                            disabled={!canEditProfile}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-mobile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                <Phone size={16} /> Mobile Number
                            </label>
                            <input
                                id="profile-mobile"
                                type="text"
                                name="mobileNumber"
                                value={formData.mobileNumber}
                                onChange={handleInputChange}
                                style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 600 }}
                                required
                            disabled={!canEditProfile}
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="profile-role" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                <Info size={16} /> System Role
                            </label>
                            <input
                                id="profile-role"
                                type="text"
                                value={(user?.role || JSON.parse(localStorage.getItem('user') || '{}').role || 'USER').toUpperCase()}
                                disabled
                                style={{ padding: '1rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 800, backgroundColor: '#f1f5f9', color: '#3730a3' }}
                            />
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="form-group" style={{ marginBottom: '2.5rem' }}>
                        <label htmlFor="profile-bio" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                            <Info size={16} /> Bio / Description
                        </label>
                        <textarea
                            id="profile-bio"
                            name="bio"
                            rows={4}
                            value={formData.bio}
                            onChange={handleInputChange}
                            placeholder="Tell us about yourself..."

                            style={{ padding: '1.25rem', borderRadius: '16px', fontSize: '1rem', fontWeight: 500, resize: 'none' }}
                            disabled={!canEditProfile}
                        ></textarea>
                    </div>

                    {/* Message */}
                    {message.text && (
                        <div style={{
                            padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem',
                            backgroundColor: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                            color: message.type === 'success' ? '#059669' : '#dc2626',
                            display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700
                        }}>
                            {message.type === 'success' ? <CheckCircle size={20} /> : <Info size={20} />}
                            {message.text}
                        </div>
                    )}

                    {/* Save Button */}
                    <div className="profile-save-row" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving || !canEditProfile}
                            style={{
                                padding: '1.1rem 2.5rem', borderRadius: '16px',
                                fontSize: '1rem', fontWeight: 800,
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                boxShadow: '0 8px 16px var(--primary-soft)'
                            }}
                        >
                            {saving ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Profile;