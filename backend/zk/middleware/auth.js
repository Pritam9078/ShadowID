// Authentication middleware for ZK endpoints
// Simple API key based authentication with rate limiting

const crypto = require('crypto');

// Configuration
const API_KEYS = new Map();
const RATE_LIMITS = new Map();

// Default configuration
const CONFIG = {
    // API key settings
    apiKeyHeader: 'x-api-key',
    defaultRateLimit: 100, // requests per minute
    
    // Rate limiting windows
    windowSizeMs: 60 * 1000, // 1 minute
    
    // Admin API key from environment (for testing/setup)
    adminApiKey: 'test_admin_key_456',
    
    // Client API keys (from environment or defaults)
    clientApiKeys: process.env.ZK_API_KEYS ? 
        process.env.ZK_API_KEYS.split(',').map(key => key.trim()) : 
        ['shadowid-client-key-2025']
};

/**
 * Initialize API keys with different permission levels
 */
function initializeApiKeys() {
    // Admin key (full access)
    API_KEYS.set(CONFIG.adminApiKey, {
        type: 'admin',
        permissions: ['*'],
        rateLimit: 1000, // Higher limit for admin
        description: 'Admin API key for ZK operations'
    });

    // Client keys (limited access)
    CONFIG.clientApiKeys.forEach((key, index) => {
        API_KEYS.set(key, {
            type: 'client',
            permissions: ['commitment', 'prove', 'verify', 'circuits'],
            rateLimit: CONFIG.defaultRateLimit,
            description: `Client API key #${index + 1}`
        });
    });

    console.log(`Initialized ${API_KEYS.size} API keys for ZK endpoints`);
}

/**
 * Generate a new API key with specified permissions
 * 
 * @param {string} type - Key type ('admin', 'client', 'readonly')
 * @param {Array} permissions - Array of allowed operations
 * @param {number} rateLimit - Requests per minute
 * @returns {string} Generated API key
 */
function generateApiKey(type = 'client', permissions = ['commitment', 'prove', 'verify'], rateLimit = CONFIG.defaultRateLimit) {
    const keyBytes = crypto.randomBytes(32);
    const apiKey = 'shadowid_' + keyBytes.toString('hex');
    
    API_KEYS.set(apiKey, {
        type,
        permissions,
        rateLimit,
        description: `Generated ${type} key`,
        createdAt: Date.now()
    });

    console.log(`Generated new ${type} API key: ${apiKey.substring(0, 16)}...`);
    
    return apiKey;
}

/**
 * Validate API key and check permissions
 * 
 * @param {string} apiKey - API key to validate
 * @param {string} operation - Operation being performed
 * @returns {Object} { valid, keyInfo, error }
 */
function validateApiKey(apiKey, operation = null) {
    if (!apiKey) {
        return {
            valid: false,
            error: 'API key is required'
        };
    }

    const keyInfo = API_KEYS.get(apiKey);
    if (!keyInfo) {
        return {
            valid: false,
            error: 'Invalid API key'
        };
    }

    // Check permissions if operation specified
    if (operation && !hasPermission(keyInfo, operation)) {
        return {
            valid: false,
            error: `Insufficient permissions for operation: ${operation}`
        };
    }

    return {
        valid: true,
        keyInfo
    };
}

/**
 * Check if API key has permission for operation
 */
function hasPermission(keyInfo, operation) {
    if (keyInfo.permissions.includes('*')) {
        return true; // Admin access
    }

    // Map operations to permission categories
    const operationPermissions = {
        'commitment': 'commitment',
        'prove': 'prove',
        'submit-proof': 'prove',
        'verify': 'verify',
        'circuits': 'circuits',
        'status': 'readonly'
    };

    const requiredPermission = operationPermissions[operation] || operation;
    return keyInfo.permissions.includes(requiredPermission) || keyInfo.permissions.includes('readonly');
}

/**
 * Rate limiting check
 * 
 * @param {string} apiKey - API key to check
 * @returns {Object} { allowed, remaining, resetTime }
 */
function checkRateLimit(apiKey) {
    const keyInfo = API_KEYS.get(apiKey);
    if (!keyInfo) {
        return { allowed: false, error: 'Invalid API key' };
    }

    const now = Date.now();
    const windowStart = now - CONFIG.windowSizeMs;
    
    // Get or create rate limit tracking for this key
    if (!RATE_LIMITS.has(apiKey)) {
        RATE_LIMITS.set(apiKey, []);
    }

    const requests = RATE_LIMITS.get(apiKey);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    RATE_LIMITS.set(apiKey, validRequests);

    // Check if under limit
    const remaining = keyInfo.rateLimit - validRequests.length;
    const resetTime = windowStart + CONFIG.windowSizeMs;

    if (remaining <= 0) {
        return {
            allowed: false,
            remaining: 0,
            resetTime,
            error: 'Rate limit exceeded'
        };
    }

    // Record this request
    validRequests.push(now);
    RATE_LIMITS.set(apiKey, validRequests);

    return {
        allowed: true,
        remaining: remaining - 1,
        resetTime
    };
}

/**
 * Express middleware for API key authentication
 */
function authenticateAPIKey(req, res, next) {
    try {
        const apiKey = req.headers[CONFIG.apiKeyHeader] || req.query.api_key;
        
        if (!apiKey) {
            return res.status(401).json({
                error: 'API key is required',
                message: `Provide API key in '${CONFIG.apiKeyHeader}' header or 'api_key' query parameter`,
                code: 'MISSING_API_KEY'
            });
        }

        // Validate API key
        const operation = extractOperation(req);
        const validation = validateApiKey(apiKey, operation);
        
        if (!validation.valid) {
            return res.status(403).json({
                error: validation.error,
                code: 'INVALID_API_KEY'
            });
        }

        // Check rate limiting
        const rateCheck = checkRateLimit(apiKey);
        if (!rateCheck.allowed) {
            res.set({
                'X-RateLimit-Limit': validation.keyInfo.rateLimit,
                'X-RateLimit-Remaining': 0,
                'X-RateLimit-Reset': Math.ceil(rateCheck.resetTime / 1000)
            });

            return res.status(429).json({
                error: rateCheck.error,
                retryAfter: Math.ceil((rateCheck.resetTime - Date.now()) / 1000),
                code: 'RATE_LIMIT_EXCEEDED'
            });
        }

        // Add rate limit headers
        res.set({
            'X-RateLimit-Limit': validation.keyInfo.rateLimit,
            'X-RateLimit-Remaining': rateCheck.remaining,
            'X-RateLimit-Reset': Math.ceil(rateCheck.resetTime / 1000)
        });

        // Add key info to request for logging
        req.apiKeyInfo = validation.keyInfo;
        req.apiKey = apiKey;

        next();

    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({
            error: 'Authentication service error',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Extract operation from request path
 */
function extractOperation(req) {
    const path = req.path;
    
    if (path.includes('/commitment')) return 'commitment';
    if (path.includes('/prove')) return 'prove';
    if (path.includes('/submit-proof')) return 'submit-proof';
    if (path.includes('/verify')) return 'verify';
    if (path.includes('/circuits')) return 'circuits';
    if (path.includes('/status')) return 'status';
    
    return 'unknown';
}

/**
 * Admin middleware - requires admin API key
 */
function requireAdmin(req, res, next) {
    if (!req.apiKeyInfo || req.apiKeyInfo.type !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            code: 'INSUFFICIENT_PRIVILEGES'
        });
    }
    next();
}

/**
 * Logging middleware for API key usage
 */
function logApiKeyUsage(req, res, next) {
    const startTime = Date.now();
    
    // Log request
    console.log(`[ZK API] ${req.method} ${req.path} - Key: ${req.apiKey?.substring(0, 16)}... - Type: ${req.apiKeyInfo?.type}`);
    
    // Override res.json to log response
    const originalJson = res.json;
    res.json = function(data) {
        const duration = Date.now() - startTime;
        const success = res.statusCode < 400;
        
        console.log(`[ZK API] Response: ${res.statusCode} - Duration: ${duration}ms - Success: ${success}`);
        
        return originalJson.call(this, data);
    };
    
    next();
}

/**
 * Get API key statistics
 */
function getApiKeyStats() {
    const stats = {
        totalKeys: API_KEYS.size,
        keysByType: {},
        rateLimitStatus: {},
        timestamp: Date.now()
    };

    // Count keys by type
    for (const [key, info] of API_KEYS) {
        stats.keysByType[info.type] = (stats.keysByType[info.type] || 0) + 1;
        
        // Get rate limit status
        const requests = RATE_LIMITS.get(key) || [];
        const recentRequests = requests.filter(t => t > Date.now() - CONFIG.windowSizeMs);
        
        stats.rateLimitStatus[key.substring(0, 16) + '...'] = {
            type: info.type,
            requestsInWindow: recentRequests.length,
            limit: info.rateLimit,
            remaining: info.rateLimit - recentRequests.length
        };
    }

    return stats;
}

/**
 * Revoke an API key
 */
function revokeApiKey(apiKey) {
    const deleted = API_KEYS.delete(apiKey);
    RATE_LIMITS.delete(apiKey);
    
    console.log(`API key revoked: ${apiKey.substring(0, 16)}... - Success: ${deleted}`);
    return deleted;
}

/**
 * List all API keys (admin only)
 */
function listApiKeys() {
    const keys = [];
    for (const [key, info] of API_KEYS) {
        keys.push({
            key: key.substring(0, 16) + '...',
            type: info.type,
            permissions: info.permissions,
            rateLimit: info.rateLimit,
            description: info.description,
            createdAt: info.createdAt
        });
    }
    return keys;
}

// Initialize on module load
initializeApiKeys();

module.exports = {
    authenticateAPIKey,
    requireAdmin,
    logApiKeyUsage,
    generateApiKey,
    validateApiKey,
    revokeApiKey,
    getApiKeyStats,
    listApiKeys,
    checkRateLimit,
    CONFIG
};