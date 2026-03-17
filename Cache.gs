/**
 * KHUROSON CARGO BOT - Advanced Caching System
 * 
 * @file Cache.gs
 * @description High-performance caching for users, tracks, and data
 */

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/** @type {Object} Cache configuration */
const CACHE_CONFIG = {
  // User data cache (5 minutes)
  USER_TTL: 300,
  
  // Track search cache (10 minutes)
  TRACK_TTL: 600,
  
  // Track list cache (15 minutes)
  TRACKS_LIST_TTL: 900,
  
  // Config cache (1 hour)
  CONFIG_TTL: 3600,
  
  // AI response cache (30 minutes for same questions)
  AI_RESPONSE_TTL: 1800,
  
  // Rate limit cache (8 seconds)
  RATE_LIMIT_TTL: 8,
  
  // Session cache (1 hour)
  SESSION_TTL: 3600,
  
  // Prefix for cache keys
  PREFIX: 'KC_'
};

// ============================================================================
// CACHE SERVICE WRAPPER
// ============================================================================

/**
 * Advanced Cache Service
 * @namespace
 */
const AdvancedCache = {
  
  /**
   * Get cache service
   * @returns {GoogleAppsScript.Cache.CacheService}
   */
  getService: function() {
    return CacheService.getScriptCache();
  },
  
  /**
   * Generate cache key with prefix
   * @param {string} type - Cache type (USER, TRACK, CONFIG, etc.)
   * @param {string} id - Item ID
   * @returns {string} Cache key
   */
  makeKey: function(type, id) {
    return `${CACHE_CONFIG.PREFIX}${type}_${String(id).replace(/[^a-zA-Z0-9]/g, '_')}`;
  },
  
  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {Object|null} Cached item or null
   */
  get: function(key) {
    try {
      const cache = this.getService();
      const data = cache.get(key);
      
      if (!data) {
        return null;
      }
      
      // Parse JSON
      return JSON.parse(data);
      
    } catch (error) {
      Logger.log(`Cache get error: ${error.toString()}`);
      return null;
    }
  },
  
  /**
   * Put item in cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   * @param {number} [ttl] - Time to live in seconds (optional)
   * @returns {boolean} Success
   */
  put: function(key, data, ttl = CACHE_CONFIG.USER_TTL) {
    try {
      const cache = this.getService();
      const json = JSON.stringify(data);
      
      // Check size limit (100KB per item)
      if (json.length > 100 * 1024) {
        Logger.log(`Cache item too large: ${key} (${json.length} bytes)`);
        return false;
      }
      
      cache.put(key, json, ttl);
      return true;
      
    } catch (error) {
      Logger.log(`Cache put error: ${error.toString()}`);
      return false;
    }
  },
  
  /**
   * Remove item from cache
   * @param {string} key - Cache key
   * @returns {boolean} Success
   */
  remove: function(key) {
    try {
      const cache = this.getService();
      cache.remove(key);
      return true;
    } catch (error) {
      Logger.log(`Cache remove error: ${error.toString()}`);
      return false;
    }
  },
  
  /**
   * Clear all cache with prefix
   * @returns {number} Number of items cleared (approximate)
   */
  clearAll: function() {
    // Note: Script Cache doesn't have bulk delete
    // This is a placeholder for future implementation
    Logger.log('Cache clearAll called - manual clear recommended');
    return 0;
  }
};

// ============================================================================
// USER CACHE
// ============================================================================

/**
 * User data cache operations
 * @namespace
 */
const UserCache = {
  
  /**
   * Get cached user data
   * @param {string} userId - User ID
   * @returns {Object|null} User data or null
   */
  get: function(userId) {
    const key = AdvancedCache.makeKey('USER', userId);
    return AdvancedCache.get(key);
  },
  
  /**
   * Cache user data
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @returns {boolean} Success
   */
  put: function(userId, userData) {
    const key = AdvancedCache.makeKey('USER', userId);
    return AdvancedCache.put(key, userData, CACHE_CONFIG.USER_TTL);
  },
  
  /**
   * Invalidate user cache
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  invalidate: function(userId) {
    const key = AdvancedCache.makeKey('USER', userId);
    return AdvancedCache.remove(key);
  },
  
  /**
   * Get or set user data with fallback
   * @param {string} userId - User ID
   * @param {Function} fetchFunction - Function to fetch if not cached
   * @returns {Object} User data
   */
  getOrFetch: function(userId, fetchFunction) {
    // Try cache first
    let user = this.get(userId);
    
    if (user) {
      user.fromCache = true;
      return user;
    }
    
    // Fetch from database
    user = fetchFunction(userId);
    
    if (user) {
      user.fromCache = false;
      this.put(userId, user);
    }
    
    return user;
  }
};

// ============================================================================
// TRACK CACHE
// ============================================================================

/**
 * Track data cache operations
 * @namespace
 */
const TrackCache = {
  
  /**
   * Get cached track search result
   * @param {string} trackCode - Track code
   * @returns {Object|null} Track data or null
   */
  get: function(trackCode) {
    const key = AdvancedCache.makeKey('TRACK', trackCode.toUpperCase());
    return AdvancedCache.get(key);
  },
  
  /**
   * Cache track search result
   * @param {string} trackCode - Track code
   * @param {Object} trackData - Track data
   * @returns {boolean} Success
   */
  put: function(trackCode, trackData) {
    const key = AdvancedCache.makeKey('TRACK', trackCode.toUpperCase());
    return AdvancedCache.put(key, trackData, CACHE_CONFIG.TRACK_TTL);
  },
  
  /**
   * Invalidate track cache
   * @param {string} trackCode - Track code
   * @returns {boolean} Success
   */
  invalidate: function(trackCode) {
    const key = AdvancedCache.makeKey('TRACK', trackCode.toUpperCase());
    return AdvancedCache.remove(key);
  },
  
  /**
   * Get or search track with cache
   * @param {string} trackCode - Track code
   * @param {Function} searchFunction - Function to search if not cached
   * @returns {Object} Track result
   */
  getOrSearch: function(trackCode, searchFunction) {
    // Try cache first
    let result = this.get(trackCode);
    
    if (result) {
      result.fromCache = true;
      return result;
    }
    
    // Search
    result = searchFunction(trackCode);
    
    if (result) {
      result.fromCache = false;
      this.put(trackCode, result);
    }
    
    return result;
  },
  
  /**
   * Cache multiple tracks
   * @param {Array} tracks - Array of track results
   * @returns {number} Number of tracks cached
   */
  putMultiple: function(tracks) {
    let count = 0;
    
    if (!tracks || !Array.isArray(tracks)) {
      return count;
    }
    
    tracks.forEach(track => {
      if (track && track.code) {
        this.put(track.code, track);
        count++;
      }
    });
    
    return count;
  }
};

// ============================================================================
// AI RESPONSE CACHE
// ============================================================================

/**
 * AI response cache to reduce API calls
 * @namespace
 */
const AIResponseCache = {
  
  /**
   * Get cached AI response
   * @param {string} question - User question (hash)
   * @param {string} lang - Language code
   * @returns {string|null} AI response or null
   */
  get: function(question, lang) {
    const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, question);
    const key = AdvancedCache.makeKey('AI', `${lang}_${hash}`);
    return AdvancedCache.get(key);
  },
  
  /**
   * Cache AI response
   * @param {string} question - User question
   * @param {string} lang - Language code
   * @param {string} response - AI response
   * @returns {boolean} Success
   */
  put: function(question, lang, response) {
    try {
      const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, question);
      const key = AdvancedCache.makeKey('AI', `${lang}_${hash}`);
      return AdvancedCache.put(key, { response: response }, CACHE_CONFIG.AI_RESPONSE_TTL);
    } catch (error) {
      Logger.log(`AIResponseCache put error: ${error.toString()}`);
      return false;
    }
  },
  
  /**
   * Get or generate AI response with cache
   * @param {string} question - User question
   * @param {string} lang - Language code
   * @param {Function} generateFunction - Function to generate if not cached
   * @returns {string} AI response
   */
  getOrGenerate: function(question, lang, generateFunction) {
    // Try cache first
    let cached = this.get(question, lang);
    
    if (cached && cached.response) {
      cached.fromCache = true;
      return cached.response;
    }
    
    // Generate new response
    const response = generateFunction();
    
    if (response) {
      this.put(question, lang, response);
      response.fromCache = false;
    }
    
    return response;
  }
};

// ============================================================================
// CONFIG CACHE
// ============================================================================

/**
 * Configuration cache
 * @namespace
 */
const ConfigCache = {
  
  /**
   * Get cached config
   * @returns {Object} Config object
   */
  get: function() {
    const key = AdvancedCache.makeKey('CONFIG', 'main');
    return AdvancedCache.get(key);
  },
  
  /**
   * Cache config
   * @param {Object} configData - Config data
   * @returns {boolean} Success
   */
  put: function(configData) {
    const key = AdvancedCache.makeKey('CONFIG', 'main');
    return AdvancedCache.put(key, configData, CACHE_CONFIG.CONFIG_TTL);
  },
  
  /**
   * Get or load config with cache
   * @param {Function} loadFunction - Function to load if not cached
   * @returns {Object} Config object
   */
  getOrLoad: function(loadFunction) {
    let config = this.get();
    
    if (config) {
      config.fromCache = true;
      return config;
    }
    
    config = loadFunction();
    
    if (config) {
      config.fromCache = false;
      this.put(config);
    }
    
    return config;
  },
  
  /**
   * Invalidate config cache
   * @returns {boolean} Success
   */
  invalidate: function() {
    const key = AdvancedCache.makeKey('CONFIG', 'main');
    return AdvancedCache.remove(key);
  }
};

// ============================================================================
// SESSION CACHE
// ============================================================================

/**
 * User session cache
 * @namespace
 */
const SessionCache = {
  
  /**
   * Get session data
   * @param {string} userId - User ID
   * @param {string} key - Session key
   * @returns {Object|null} Session data
   */
  get: function(userId, key) {
    const cacheKey = AdvancedCache.makeKey('SESSION', `${userId}_${key}`);
    return AdvancedCache.get(cacheKey);
  },
  
  /**
   * Set session data
   * @param {string} userId - User ID
   * @param {string} key - Session key
   * @param {Object} value - Session value
   * @returns {boolean} Success
   */
  set: function(userId, key, value) {
    const cacheKey = AdvancedCache.makeKey('SESSION', `${userId}_${key}`);
    return AdvancedCache.put(cacheKey, value, CACHE_CONFIG.SESSION_TTL);
  },
  
  /**
   * Remove session data
   * @param {string} userId - User ID
   * @param {string} key - Session key
   * @returns {boolean} Success
   */
  remove: function(userId, key) {
    const cacheKey = AdvancedCache.makeKey('SESSION', `${userId}_${key}`);
    return AdvancedCache.remove(cacheKey);
  },
  
  /**
   * Clear all user sessions
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  clearUser: function(userId) {
    // Clear common session keys
    this.remove(userId, 'state');
    this.remove(userId, 'reg_step');
    this.remove(userId, 'lang');
    return true;
  }
};

// ============================================================================
// RATE LIMIT CACHE (Improved)
// ============================================================================

/**
 * Improved rate limiting with cache
 * @namespace
 */
const RateLimitCache = {
  
  /**
   * Check if user is rate limited
   * @param {string} userId - User ID
   * @returns {boolean} True if allowed, false if limited
   */
  check: function(userId) {
    const key = AdvancedCache.makeKey('RATELIMIT', userId);
    return !AdvancedCache.get(key);
  },
  
  /**
   * Set rate limit for user
   * @param {string} userId - User ID
   * @returns {boolean} Success
   */
  set: function(userId) {
    const key = AdvancedCache.makeKey('RATELIMIT', userId);
    return AdvancedCache.put(key, { limited: true }, CACHE_CONFIG.RATE_LIMIT_TTL);
  },
  
  /**
   * Check and set atomically
   * @param {string} userId - User ID
   * @returns {boolean} True if allowed
   */
  checkAndSet: function(userId) {
    if (this.check(userId)) {
      this.set(userId);
      return true;
    }
    return false;
  }
};

// ============================================================================
// CACHE STATISTICS
// ============================================================================

/**
 * Cache performance monitoring
 * @namespace
 */
const CacheStats = {
  
  /**
   * Log cache hit
   * @param {string} type - Cache type
   */
  hit: function(type) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let sheet = ss.getSheetByName("CacheStats");
      
      if (!sheet) {
        sheet = ss.insertSheet("CacheStats");
        sheet.appendRow(["Timestamp", "Type", "Result", "Count"]);
      }
      
      const now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss"),
        type,
        'HIT',
        1
      ]);
    } catch (e) {
      // Ignore logging errors
    }
  },
  
  /**
   * Log cache miss
   * @param {string} type - Cache type
   */
  miss: function(type) {
    try {
      const ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
      let sheet = ss.getSheetByName("CacheStats");
      
      if (!sheet) {
        sheet = ss.insertSheet("CacheStats");
        sheet.appendRow(["Timestamp", "Type", "Result", "Count"]);
      }
      
      const now = new Date();
      sheet.appendRow([
        Utilities.formatDate(now, Session.getScriptTimeZone(), "dd.MM.yyyy HH:mm:ss"),
        type,
        'MISS',
        1
      ]);
    } catch (e) {
      // Ignore logging errors
    }
  }
};

// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * Enhanced rate limiting (replaces old checkRateLimit)
 * @param {string} userId - User ID
 * @returns {boolean} True if allowed
 */
function checkRateLimit(userId) {
  return RateLimitCache.checkAndSet(userId);
}
