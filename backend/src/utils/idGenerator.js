const { v4: uuidv4 } = require('uuid');

// ID Prefixes for different entities
const ID_PREFIXES = {
    SHIPMENT: 'SHP',
    USER: 'USR',
    CUSTOMER: 'CUS',
    SHIPPER: 'SHR',
    CONSIGNEE: 'CON',
    NOTIFY_PARTY: 'NTP',
    AIRLINE: 'AIR',
    LEG: 'LEG'
};

// Generate a unique ID with a prefix
const generateUniqueId = (prefix = '') => {
    const uuid = uuidv4().replace(/-/g, '').substring(0, 8);
    return `${prefix}${uuid}`.toUpperCase();
};

// Generate a random password
const generateRandomPassword = (length = 10) => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset[randomIndex];
    }
    return password;
};

module.exports = {
    ID_PREFIXES,
    generateUniqueId,
    generateRandomPassword
}; 