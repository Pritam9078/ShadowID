/**
 * Admin Configuration for ShadowID Platform
 * Centralized admin wallet management for both frontend and backend
 */

// Admin wallet addresses with full access to admin panel and DAO operations
export const ADMIN_ADDRESSES = [
    // Original deployer/admin addresses
    '0xa62463a56ee9d742f810920f56cebc4b696ebd0a', // Deployer address (original)
    '0xa62463A56EE9D742F810920F56cEbc4B696eBd0a', // Alternative case variant
    
    // Private Key: 9b5f44e759a897239d9b9a0320192a7ee2a0df1e91a18f67f04115d9f8f2c174
    '0x5b329bad3f32ECEF4dfedEe035807E7C9925c960', // ✅ Derived from provided private key
    '0x5B329BAD3F32ECEF4DFEDEE035807E7C9925C960', // Uppercase variant for safety
];

/**
 * Check if an address has admin privileges
 * @param {string} address - Wallet address to check
 * @returns {boolean} - True if address is admin
 */
export function isAdmin(address) {
    if (!address) return false;
    
    return ADMIN_ADDRESSES.some(adminAddr => 
        address.toLowerCase() === adminAddr.toLowerCase()
    );
}

/**
 * Add a new admin address
 * @param {string} newAddress - New admin wallet address
 * @returns {boolean} - True if successfully added, false if already exists
 */
export function addAdminAddress(newAddress) {
    if (!newAddress || isAdmin(newAddress)) {
        return false;
    }
    
    ADMIN_ADDRESSES.push(newAddress);
    console.log(`✅ Added new admin address: ${newAddress}`);
    return true;
}

/**
 * Remove an admin address
 * @param {string} addressToRemove - Admin address to remove
 * @returns {boolean} - True if successfully removed
 */
export function removeAdminAddress(addressToRemove) {
    const index = ADMIN_ADDRESSES.findIndex(addr => 
        addr.toLowerCase() === addressToRemove.toLowerCase()
    );
    
    if (index === -1) {
        return false;
    }
    
    ADMIN_ADDRESSES.splice(index, 1);
    console.log(`🗑️ Removed admin address: ${addressToRemove}`);
    return true;
}

/**
 * Get all admin addresses
 * @returns {string[]} - Array of admin addresses
 */
export function getAllAdminAddresses() {
    return [...ADMIN_ADDRESSES];
}

// For Node.js/backend compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ADMIN_ADDRESSES,
        isAdmin,
        addAdminAddress,
        removeAdminAddress,
        getAllAdminAddresses
    };
}

// Log current admin configuration for debugging
console.log('🔐 Admin Configuration Loaded:');
console.log(`   Total Admin Addresses: ${ADMIN_ADDRESSES.length}`);
ADMIN_ADDRESSES.forEach((addr, index) => {
    console.log(`   ${index + 1}. ${addr}`);
});