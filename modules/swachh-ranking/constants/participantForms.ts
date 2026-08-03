export const createOfficeDetails = () => ({
    name: '',
    address: '',
    officeType: '',
    wardName: '',
    wardNumber: '',
    zoneNumber: '',
    inchargeName: '',
    inchargeContact: ''
});

export const createSocietyDetails = () => ({
    name: '',
    address: '',
    wardName: '',
    wardNo: '',
    zoneNumber: '',
    chairmanName: '',
    chairmanContact: ''
});

export const createHospitalDetails = () => ({
    name: '',
    address: '',
    wardName: '',
    wardNo: '',
    zoneNo: '',
    hospitalType: '',
    numberOfBeds: '',
    adminName: '',
    adminContact: ''
});

export const createWardDetails = () => ({
    wardNumber: '',
    wardName: '',
    zoneNumber: '',
    officerName: '',
    officerContact: ''
});

export const createHotelDetails = () => ({
    name: '',
    type: '',
    wardName: '',
    wardNo: '',
    zoneNo: '',
    address: '',
    inchargeName: '',
    inchargeContact: ''
});

export const createSchoolDetails = () => ({
    name: '',
    wardName: '',
    wardNumber: '',
    zoneNumber: '',
    address: '',
    schoolType: '',
    medium: '',
    totalStudents: '',
    totalStaff: '',
    principalName: '',
    principalContact: ''
});

export const createMarketDetails = () => ({
    name: '',
    address: '',
    noOfShops: '',
    noOfHawkers: '',
    ward: '',
    zone: '',
    associationHeadName: '',
    associationHeadContact: '',
    inchargeSIName: '',
    inchargeSIContact: ''
});

export const createCitizenDetails = () => ({
    name: '',
    type: '',
    wardName: '',
    phoneNumber: '',
    detailsOfWork: '',
    officeAddress: '',
    directorName: '',
    yearOfEstablishment: ''
});

export type OfficeDetails = ReturnType<typeof createOfficeDetails>;
export type SocietyDetails = ReturnType<typeof createSocietyDetails>;
export type HospitalDetails = ReturnType<typeof createHospitalDetails>;
export type WardDetails = ReturnType<typeof createWardDetails>;
export type HotelDetails = ReturnType<typeof createHotelDetails>;
export type SchoolDetails = ReturnType<typeof createSchoolDetails>;
export type MarketDetails = ReturnType<typeof createMarketDetails>;
export type CitizenDetails = ReturnType<typeof createCitizenDetails>;
