/**
 * Simple in-memory cache for AI responses
 * This helps reduce API calls and improve performance
 */
class CacheManager {
  constructor(ttl = 3600000) { // Default TTL: 1 hour
    this.cache = new Map();
    this.ttl = ttl;
  }

  /**
   * Get a value from the cache
   * @param {string} key - The cache key
   * @returns {any|null} - The cached value or null if not found/expired
   */
  get(key) {
    if (!this.cache.has(key)) {
      return null;
    }

    const { value, expiry } = this.cache.get(key);
    
    // Check if the cached value has expired
    if (Date.now() > expiry) {
      this.cache.delete(key);
      return null;
    }

    return value;
  }

  /**
   * Set a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to cache
   * @param {number} [customTtl] - Optional custom TTL in milliseconds
   */
  set(key, value, customTtl) {
    const ttl = customTtl || this.ttl;
    const expiry = Date.now() + ttl;
    
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a value from the cache
   * @param {string} key - The cache key
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all expired entries from the cache
   */
  cleanup() {
    const now = Date.now();
    for (const [key, { expiry }] of this.cache.entries()) {
      if (now > expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear the entire cache
   */
  clear() {
    this.cache.clear();
  }
}

// Create cache instances with different TTLs
const shortTermCache = new CacheManager(300000); // 5 minutes
const mediumTermCache = new CacheManager(3600000); // 1 hour
const longTermCache = new CacheManager(86400000); // 24 hours

export { shortTermCache, mediumTermCache, longTermCache };