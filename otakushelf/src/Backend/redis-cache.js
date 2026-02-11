// Redis Caching Implementation for Production Scale
// Replace in-memory caching with Redis for horizontal scaling

import Redis from 'ioredis';

// ============================================
// REDIS CLIENT SETUP
// ============================================
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: false,
    lazyConnect: true
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err));
redis.on('close', () => console.warn('⚠️ Redis connection closed'));

// Connect to Redis
redis.connect().catch(err => {
    console.error('Failed to connect to Redis:', err);
    console.warn('⚠️ Running without Redis cache');
});

// ============================================
// CACHE WRAPPER WITH FALLBACK
// ============================================
class CacheManager {
    constructor(redisClient) {
        this.redis = redisClient;
        this.memoryCache = new Map(); // Fallback
        this.maxMemoryCacheSize = 100; // Limit memory cache
    }

    async get(key) {
        try {
            if (this.redis.status === 'ready') {
                const value = await this.redis.get(key);
                return value ? JSON.parse(value) : null;
            }
        } catch (error) {
            console.error('Redis GET error:', error);
        }

        // Fallback to memory
        return this.memoryCache.get(key) || null;
    }

    async set(key, value, ttlSeconds = 3600) {
        const stringValue = JSON.stringify(value);

        try {
            if (this.redis.status === 'ready') {
                await this.redis.setex(key, ttlSeconds, stringValue);
                return true;
            }
        } catch (error) {
            console.error('Redis SET error:', error);
        }

        // Fallback to memory with LRU eviction
        if (this.memoryCache.size >= this.maxMemoryCacheSize) {
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        this.memoryCache.set(key, value);

        // Auto-expire in memory
        setTimeout(() => {
            this.memoryCache.delete(key);
        }, ttlSeconds * 1000);

        return true;
    }

    async del(key) {
        try {
            if (this.redis.status === 'ready') {
                await this.redis.del(key);
            }
        } catch (error) {
            console.error('Redis DEL error:', error);
        }

        this.memoryCache.delete(key);
    }

    async flush() {
        try {
            if (this.redis.status === 'ready') {
                await this.redis.flushdb();
            }
        } catch (error) {
            console.error('Redis FLUSH error:', error);
        }

        this.memoryCache.clear();
    }

    async exists(key) {
        try {
            if (this.redis.status === 'ready') {
                return await this.redis.exists(key) === 1;
            }
        } catch (error) {
            console.error('Redis EXISTS error:', error);
        }

        return this.memoryCache.has(key);
    }
}

const cache = new CacheManager(redis);

// ============================================
// CACHE MIDDLEWARE
// ============================================
function cacheMiddleware(duration = 3600) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `cache:${req.originalUrl}`;

        try {
            const cachedData = await cache.get(key);

            if (cachedData) {
                // Add cache headers
                res.set('X-Cache', 'HIT');
                res.set('Cache-Control', `public, max-age=${duration}`);
                return res.json(cachedData);
            }

            // Intercept res.json to cache the response
            const originalJson = res.json.bind(res);
            res.json = (data) => {
                cache.set(key, data, duration).catch(console.error);
                res.set('X-Cache', 'MISS');
                res.set('Cache-Control', `public, max-age=${duration}`);
                return originalJson(data);
            };

            next();
        } catch (error) {
            console.error('Cache middleware error:', error);
            next();
        }
    };
}

// ============================================
// USAGE IN ROUTES
// ============================================

// Example: Cache anime sections for 30 minutes
router.get('/anime-sections',
    cacheMiddleware(1800), // 30 minutes
    async (req, res) => {
        // Your existing route logic
    }
);

// Example: Cache hero trailers for 1 hour
router.get('/hero-trailers',
    cacheMiddleware(3600), // 1 hour
    async (req, res) => {
        // Your existing route logic
    }
);

// ============================================
// CACHE INVALIDATION
// ============================================

// Invalidate specific cache
async function invalidateCache(pattern) {
    try {
        if (redis.status === 'ready') {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(...keys);
                console.log(`Invalidated ${keys.length} cache keys matching ${pattern}`);
            }
        }
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}

// Example: Invalidate all anime caches when data updates
async function onAnimeUpdate() {
    await invalidateCache('cache:/api/anime/*');
}

// ============================================
// CACHE WARMING (Optional)
// ============================================

async function warmCache() {
    console.log('Warming cache...');

    try {
        // Warm up critical endpoints
        const criticalEndpoints = [
            '/api/anime/anime-sections',
            '/api/anilist/hero-trailers'
        ];

        for (const endpoint of criticalEndpoints) {
            try {
                const response = await axios.get(`http://localhost:${PORT}${endpoint}`);
                console.log(`✅ Warmed cache for ${endpoint}`);
            } catch (error) {
                console.error(`❌ Failed to warm cache for ${endpoint}:`, error.message);
            }
        }
    } catch (error) {
        console.error('Cache warming error:', error);
    }
}

// Warm cache on startup (after server starts)
setTimeout(warmCache, 5000);

// ============================================
// REDIS SESSION STORE (Better than MongoDB)
// ============================================

import RedisStore from 'connect-redis';

const sessionStore = new RedisStore({
    client: redis,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
});

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24,
        sameSite: isProduction ? 'none' : 'lax'
    },
    name: 'sessionId'
}));

// ============================================
// MONITORING & STATS
// ============================================

async function getCacheStats() {
    try {
        if (redis.status === 'ready') {
            const info = await redis.info('stats');
            const keyspace = await redis.info('keyspace');

            return {
                status: 'connected',
                info: info,
                keyspace: keyspace,
                memoryCache: {
                    size: cache.memoryCache.size,
                    maxSize: cache.maxMemoryCacheSize
                }
            };
        }
    } catch (error) {
        console.error('Cache stats error:', error);
    }

    return {
        status: 'disconnected',
        memoryCache: {
            size: cache.memoryCache.size,
            maxSize: cache.maxMemoryCacheSize
        }
    };
}

// Add to health check endpoint
app.get('/health', async (req, res) => {
    const cacheStats = await getCacheStats();

    res.json({
        uptime: process.uptime(),
        cache: cacheStats,
        // ... other health checks
    });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

async function shutdownCache() {
    try {
        await redis.quit();
        console.log('Redis connection closed gracefully');
    } catch (error) {
        console.error('Error closing Redis:', error);
    }
}

// Add to existing graceful shutdown
process.on('SIGTERM', async () => {
    await shutdownCache();
    // ... rest of shutdown logic
});

// ============================================
// REQUIRED NPM PACKAGES
// ============================================
/*
npm install ioredis connect-redis

Add to package.json:
{
  "dependencies": {
    "ioredis": "^5.3.2",
    "connect-redis": "^7.1.0"
  }
}

REDIS SETUP:
- Development: docker run -d -p 6379:6379 redis:alpine
- Production: Use Redis Cloud, AWS ElastiCache, or similar managed service

ENVIRONMENT VARIABLES:
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password (if required)
*/

export { cache, cacheMiddleware, invalidateCache, warmCache, getCacheStats };
