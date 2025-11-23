/**
 * Backend Admin Configuration for ShadowID Platform
 * Server-side admin wallet management and authentication
 */

// Admin wallet addresses with full access to admin operations
const ADMIN_ADDRESSES = [
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
function isAdmin(address) {
    if (!address) return false;
    
    return ADMIN_ADDRESSES.some(adminAddr => 
        address.toLowerCase() === adminAddr.toLowerCase()
    );
}

/**
 * Express middleware to check admin privileges
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object  
 * @param {Function} next - Express next function
 */
function requireAdmin(req, res, next) {
    const userAddress = req.headers['x-user-address'] || req.body.userAddress || req.query.userAddress;
    
    if (!userAddress) {
        return res.status(401).json({
            success: false,
            error: 'User address required for admin operations'
        });
    }
    
    if (!isAdmin(userAddress)) {
        return res.status(403).json({
            success: false,
            error: 'Admin privileges required for this operation'
        });
    }
    
    // Add admin status to request object
    req.isAdmin = true;
    req.adminAddress = userAddress;
    next();
}

/**
 * Validate admin signature (for enhanced security)
 * @param {string} message - Message that was signed
 * @param {string} signature - Signature to verify
 * @param {string} address - Address that supposedly signed the message
 * @returns {boolean} - True if signature is valid and from admin
 */
function validateAdminSignature(message, signature, address) {
    // This would implement proper signature verification
    // For now, we'll just check if the address is admin
    return isAdmin(address);
}

/**
 * Get all admin addresses
 * @returns {string[]} - Array of admin addresses
 */
function getAllAdminAddresses() {
    return [...ADMIN_ADDRESSES];
}

/**
 * Add a new admin address (only callable by existing admins)
 * @param {string} newAddress - New admin wallet address
 * @param {string} callerAddress - Address of the caller (must be admin)
 * @returns {boolean} - True if successfully added
 */
function addAdminAddress(newAddress, callerAddress) {
    if (!isAdmin(callerAddress)) {
        console.log(`❌ Unauthorized attempt to add admin by: ${callerAddress}`);
        return false;
    }
    
    if (!newAddress || isAdmin(newAddress)) {
        return false;
    }
    
    ADMIN_ADDRESSES.push(newAddress);
    console.log(`✅ Admin ${callerAddress} added new admin address: ${newAddress}`);
    return true;
}

/**
 * Log admin activity for security monitoring
 * @param {string} action - Action performed
 * @param {string} adminAddress - Admin who performed the action
 * @param {Object} details - Additional details about the action
 */
function logAdminActivity(action, adminAddress, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        action,
        adminAddress,
        details,
        ip: details.ip || 'unknown'
    };
    
    console.log(`🔐 ADMIN ACTIVITY: ${JSON.stringify(logEntry)}`);
    
    // In production, you'd save this to a secure audit log
    // e.g., save to database, send to monitoring service, etc.
}

// Log current admin configuration on module load
console.log('🔐 Backend Admin Configuration Loaded:');
console.log(`   Total Admin Addresses: ${ADMIN_ADDRESSES.length}`);
ADMIN_ADDRESSES.forEach((addr, index) => {
    console.log(`   ${index + 1}. ${addr}`);
});

module.exports = {
    ADMIN_ADDRESSES,
    isAdmin,
    requireAdmin,
    validateAdminSignature,
    getAllAdminAddresses,
    addAdminAddress,
    logAdminActivity
};