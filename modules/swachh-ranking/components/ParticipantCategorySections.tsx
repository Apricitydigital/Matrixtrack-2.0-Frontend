import React from 'react';
import {
    CitizenDetails,
    HotelDetails,
    HospitalDetails,
    MarketDetails,
    OfficeDetails,
    SchoolDetails,
    SocietyDetails,
    WardDetails
} from '../constants/participantForms';
import { wardOptions } from '../constants/wardOptions';
import { normalizeParticipantCategory } from '../utils/participants';

type CategoryState<T> = {
    value: T;
    onChange: (value: T) => void;
};

interface CategoryStates {
    offices: CategoryState<OfficeDetails>;
    societies: CategoryState<SocietyDetails>;
    hospitals: CategoryState<HospitalDetails>;
    wards: CategoryState<WardDetails>;
    hotels: CategoryState<HotelDetails>;
    schools: CategoryState<SchoolDetails>;
    markets: CategoryState<MarketDetails>;
    citizen: CategoryState<CitizenDetails>;
}

interface ParticipantCategorySectionsProps {
    role: string;
    states: CategoryStates;
    disabled?: boolean;
}

const ParticipantCategorySections: React.FC<ParticipantCategorySectionsProps> = ({ role, states, disabled }) => {
    const normalizedRole = normalizeParticipantCategory(role);
    const getInputProps = () => (disabled ? { disabled: true } : {});
    const renderWardSelect = (
        value: string,
        onChange: (value: string) => void,
        label = 'Ward Name'
    ) => (
        <div className="form-group">
            <label>{label}</label>
            <select
                required
                value={value}
                {...getInputProps()}
                onChange={(e) => onChange(e.target.value)}
            >
                <option value="" disabled>
                    Select Ward Name
                </option>
                {wardOptions.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
                {value && !wardOptions.includes(value) && (
                    <option value={value}>{value}</option>
                )}
            </select>
        </div>
    );

    const updateState = <T extends object>(state: CategoryState<T>, field: keyof T, value: any) => {
        state.onChange({
            ...state.value,
            [field]: value
        });
    };

    if (normalizedRole === 'offices') {
        const office = states.offices.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Office Participation Details</p>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Office Name</label>
                        <input
                            type="text"
                            placeholder="Full Office Name"
                            required
                            value={office.name}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Office Address</label>
                        <input
                            type="text"
                            placeholder="Full Address"
                            required
                            value={office.address}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'address', e.target.value)}
                        />
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Office Type</label>
                    <select
                        required
                        value={office.officeType}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.offices, 'officeType', e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                    </select>
                </div>
                {renderWardSelect(office.wardName, (value) => updateState(states.offices, 'wardName', value))}
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Ward Number</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={office.wardNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'wardNumber', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Zone Number</label>
                        <input
                            type="text"
                            placeholder="Zone #"
                            required
                            value={office.zoneNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'zoneNumber', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Office Incharge Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={office.inchargeName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'inchargeName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Office Incharge Contact</label>
                        <input
                            type="text"
                            placeholder="Contact Number"
                            required
                            value={office.inchargeContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.offices, 'inchargeContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'wards') {
        const ward = states.wards.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Ward Participation Details</p>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Ward Number</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={ward.wardNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.wards, 'wardNumber', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Zone Number</label>
                        <input
                            type="text"
                            placeholder="Zone #"
                            required
                            value={ward.zoneNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.wards, 'zoneNumber', e.target.value)}
                        />
                    </div>
                </div>
                {renderWardSelect(ward.wardName, (value) => updateState(states.wards, 'wardName', value))}
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Ward Officer Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={ward.officerName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.wards, 'officerName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Ward Officer Contact Details</label>
                        <input
                            type="text"
                            placeholder="Mobile / Office Phone"
                            required
                            value={ward.officerContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.wards, 'officerContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'societies - bwg') {
        const society = states.societies.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Society Registration Details</p>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Society Name</label>
                        <input
                            type="text"
                            placeholder="Full Society Name"
                            required
                            value={society.name}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Address</label>
                        <input
                            type="text"
                            placeholder="Full Address"
                            required
                            value={society.address}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'address', e.target.value)}
                        />
                    </div>
                </div>
                {renderWardSelect(society.wardName, (value) => updateState(states.societies, 'wardName', value))}
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Ward Number</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={society.wardNo}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'wardNo', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Zone Number</label>
                        <input
                            type="text"
                            placeholder="Zone #"
                            required
                            value={society.zoneNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'zoneNumber', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Chairperson Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={society.chairmanName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'chairmanName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Chairperson Contact</label>
                        <input
                            type="text"
                            placeholder="Contact Number"
                            required
                            value={society.chairmanContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.societies, 'chairmanContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'hospitals') {
        const hospital = states.hospitals.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Hospital Registration Details</p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Hospital Name</label>
                    <input
                        type="text"
                        placeholder="Full Name"
                        required
                        value={hospital.name}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.hospitals, 'name', e.target.value)}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Hospital Address</label>
                    <input
                        type="text"
                        placeholder="Full Address"
                        required
                        value={hospital.address}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.hospitals, 'address', e.target.value)}
                    />
                </div>
                {renderWardSelect(hospital.wardName, (value) => updateState(states.hospitals, 'wardName', value))}
                <div className="form-group">
                    <label>Hospital Type</label>
                    <select
                        required
                        value={hospital.hospitalType}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.hospitals, 'hospitalType', e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="Government">Government</option>
                        <option value="Private">Private</option>
                        <option value="Trust">Trust</option>
                    </select>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Number of Beds</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Bed Count"
                            required
                            value={hospital.numberOfBeds}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hospitals, 'numberOfBeds', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Ward No.</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={hospital.wardNo}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hospitals, 'wardNo', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Zone No.</label>
                        <input
                            type="text"
                            placeholder="Zone #"
                            required
                            value={hospital.zoneNo}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hospitals, 'zoneNo', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Hospital Admin Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={hospital.adminName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hospitals, 'adminName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Hospital Admin Contact</label>
                        <input
                            type="text"
                            placeholder="Contact #"
                            required
                            value={hospital.adminContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hospitals, 'adminContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'schools') {
        const school = states.schools.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>School Registration Details</p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Name of School</label>
                    <input
                        type="text"
                        placeholder="Full School Name"
                        required
                        value={school.name}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.schools, 'name', e.target.value)}
                    />
                </div>
                <div className="two-column-grid">
                    {renderWardSelect(school.wardName, (value) => updateState(states.schools, 'wardName', value))}
                    <div className="form-group">
                        <label>Ward Number</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={school.wardNumber}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'wardNumber', e.target.value)}
                        />
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Zone Number</label>
                    <input
                        type="text"
                        placeholder="Zone #"
                        required
                        value={school.zoneNumber}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.schools, 'zoneNumber', e.target.value)}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>School Address</label>
                    <input
                        type="text"
                        placeholder="Full Address"
                        required
                        value={school.address}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.schools, 'address', e.target.value)}
                    />
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>School Type</label>
                        <select
                            required
                            value={school.schoolType}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'schoolType', e.target.value)}
                        >
                            <option value="">Select Type</option>
                            <option value="Government">Government</option>
                            <option value="Private">Private</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Medium of Instruction</label>
                        <input
                            type="text"
                            placeholder="Medium"
                            required
                            value={school.medium}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'medium', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Total Students</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Count"
                            required
                            value={school.totalStudents}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'totalStudents', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Total Staff</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Count"
                            required
                            value={school.totalStaff}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'totalStaff', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Principal Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={school.principalName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'principalName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Principal Contact</label>
                        <input
                            type="text"
                            placeholder="Contact #"
                            required
                            value={school.principalContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.schools, 'principalContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'hotels') {
        const hotel = states.hotels.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Hotel / Restaurant Registration Details</p>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Hotel / Restaurant Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={hotel.name}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'name', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Establishment Type</label>
                        <select
                            required
                            value={hotel.type}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'type', e.target.value)}
                        >
                            <option value="">Select Establishment</option>
                            <option value="Hotel">Hotel</option>
                            <option value="Restaurant">Restaurant</option>
                        </select>
                    </div>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Address</label>
                    <input
                        type="text"
                        placeholder="Full Address"
                        required
                        value={hotel.address}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.hotels, 'address', e.target.value)}
                    />
                </div>
                {renderWardSelect(hotel.wardName, (value) => updateState(states.hotels, 'wardName', value))}
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Ward No</label>
                        <input
                            type="text"
                            placeholder="Ward #"
                            required
                            value={hotel.wardNo}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'wardNo', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Zone No</label>
                        <input
                            type="text"
                            placeholder="Zone #"
                            required
                            value={hotel.zoneNo}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'zoneNo', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Hotel Incharge Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={hotel.inchargeName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'inchargeName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Hotel Incharge Contact</label>
                        <input
                            type="text"
                            placeholder="Contact #"
                            required
                            value={hotel.inchargeContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.hotels, 'inchargeContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'markets') {
        const market = states.markets.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Market Registration Details</p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Market Name</label>
                    <input
                        type="text"
                        placeholder="Enter market name"
                        required
                        value={market.name}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.markets, 'name', e.target.value)}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Market Address</label>
                    <input
                        type="text"
                        placeholder="Full Address"
                        required
                        value={market.address}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.markets, 'address', e.target.value)}
                    />
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>No. of Shops</label>
                        <input
                            type="number"
                            placeholder="Count"
                            required
                            value={market.noOfShops}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'noOfShops', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>No. of Hawkers</label>
                        <input
                            type="number"
                            placeholder="Count"
                            required
                            value={market.noOfHawkers}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'noOfHawkers', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    {renderWardSelect(market.ward, (value) => updateState(states.markets, 'ward', value))}
                    <div className="form-group">
                        <label>Zone</label>
                        <input
                            type="text"
                            placeholder="Zone Name"
                            required
                            value={market.zone}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'zone', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Association Head Name (Optional)</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={market.associationHeadName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'associationHeadName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Association Head Contact (Optional)</label>
                        <input
                            type="text"
                            placeholder="Contact #"
                            value={market.associationHeadContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'associationHeadContact', e.target.value)}
                        />
                    </div>
                </div>
                <div className="two-column-grid">
                    <div className="form-group">
                        <label>Incharge SI Name</label>
                        <input
                            type="text"
                            placeholder="Full Name"
                            required
                            value={market.inchargeSIName}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'inchargeSIName', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label>Incharge SI Contact</label>
                        <input
                            type="text"
                            placeholder="Contact #"
                            required
                            value={market.inchargeSIContact}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.markets, 'inchargeSIContact', e.target.value)}
                        />
                    </div>
                </div>
            </div>
        );
    }
    if (normalizedRole === 'citizen_puraskar') {
        const citizen = states.citizen.value;
        return (
            <div style={{ backgroundColor: '#fcfdfe', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--swachh-green)', marginBottom: '1rem', textTransform: 'uppercase' }}>Citizen / Organization Registration Details</p>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Name</label>
                    <input
                        type="text"
                        placeholder="Enter official name"
                        required
                        value={citizen.name}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.citizen, 'name', e.target.value)}
                    />
                </div>
                {renderWardSelect(citizen.wardName, (value) => updateState(states.citizen, 'wardName', value))}
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Type</label>
                    <select
                        required
                        value={citizen.type}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.citizen, 'type', e.target.value)}
                    >
                        <option value="">Select Type</option>
                        <option value="NGO">NGO</option>
                        <option value="Citizen Group">Citizen Group</option>
                        <option value="Other Organization">Other Organization</option>
                    </select>
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Phone Number of Contact Person</label>
                    <input
                        type="text"
                        placeholder="10-digit contact number"
                        required
                        maxLength={10}
                        value={citizen.phoneNumber}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.citizen, 'phoneNumber', e.target.value.replace(/\\D/g, ''))}
                    />
                </div>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <label>Details of Work</label>
                    <textarea
                        required
                        placeholder="Describe the work done by the organization or group"
                        value={citizen.detailsOfWork}
                        {...getInputProps()}
                        onChange={(e) => updateState(states.citizen, 'detailsOfWork', e.target.value)}
                        style={{ width: '100%', minHeight: '120px', borderRadius: '10px', padding: '0.75rem', border: '1px solid var(--border)' }}
                    />
                </div>
                {citizen.type === 'NGO' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="form-group">
                            <label>Office Address</label>
                            <input
                                type="text"
                                placeholder="Registered office address"
                                required
                                value={citizen.officeAddress}
                                {...getInputProps()}
                                onChange={(e) => updateState(states.citizen, 'officeAddress', e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Name of Director</label>
                            <input
                                type="text"
                                placeholder="Director / Chairperson Name"
                                required
                                value={citizen.directorName}
                                {...getInputProps()}
                                onChange={(e) => updateState(states.citizen, 'directorName', e.target.value)}
                            />
                        </div>
                    </div>
                ) : citizen.type ? (
                    <div className="form-group">
                        <label>Year of Establishment</label>
                        <input
                            type="number"
                            placeholder="e.g. 2015"
                            required
                            value={citizen.yearOfEstablishment}
                            {...getInputProps()}
                            onChange={(e) => updateState(states.citizen, 'yearOfEstablishment', e.target.value)}
                            min="1900"
                            max={new Date().getFullYear()}
                        />
                    </div>
                ) : null}
            </div>
        );
    }
    return null;
};

export default ParticipantCategorySections;
