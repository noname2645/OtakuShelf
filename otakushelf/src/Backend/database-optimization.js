// Database Optimization for Production Scale
// MongoDB Indexing and Query Optimization

// ============================================
// 1. USER MODEL INDEXES
// ============================================

// In User.js model, add these indexes:
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ 'profile.username': 1 }, { sparse: true });

// Compound index for common queries
UserSchema.index({ email: 1, createdAt: -1 });

// ============================================
// 2. ANIME LIST MODEL INDEXES
// ============================================

// In AnimeList.js model, add these indexes:
AnimeListSchema.index({ userId: 1 });
AnimeListSchema.index({ userId: 1, 'watching.animeId': 1 });
AnimeListSchema.index({ userId: 1, 'completed.animeId': 1 });
AnimeListSchema.index({ userId: 1, 'planToWatch.animeId': 1 });
AnimeListSchema.index({ userId: 1, 'dropped.animeId': 1 });

// Compound indexes for efficient queries
AnimeListSchema.index({ userId: 1, 'watching.updatedAt': -1 });
AnimeListSchema.index({ userId: 1, 'completed.rating': -1 });

// ============================================
// 3. SESSION COLLECTION INDEXES
// ============================================

// MongoDB sessions collection (if using MongoStore)
db.sessions.createIndex({ "expires": 1 }, { expireAfterSeconds: 0 });
db.sessions.createIndex({ "session.passport.user": 1 });

// ============================================
// 4. QUERY OPTIMIZATION EXAMPLES
// ============================================

// BAD: Fetching entire document when only need specific fields
const userBad = await User.findById(userId);

// GOOD: Use projection to fetch only needed fields
const userGood = await User.findById(userId)
    .select('email profile.username profile.avatar')
    .lean(); // .lean() returns plain JS object (faster)

// BAD: Multiple separate queries
const watchingBad = await AnimeList.findOne({ userId });
const completedBad = await AnimeList.findOne({ userId });

// GOOD: Single query with aggregation
const listsGood = await AnimeList.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
        $project: {
            watchingCount: { $size: '$watching' },
            completedCount: { $size: '$completed' },
            totalAnime: {
                $add: [
                    { $size: '$watching' },
                    { $size: '$completed' },
                    { $size: '$planToWatch' },
                    { $size: '$dropped' }
                ]
            }
        }
    }
]);

// ============================================
// 5. PAGINATION (CRITICAL FOR SCALE)
// ============================================

// BAD: Loading all results
const allAnimeBad = await AnimeList.find({ userId });

// GOOD: Cursor-based pagination
async function getAnimePaginated(userId, lastId = null, limit = 20) {
    const query = { userId };

    if (lastId) {
        query._id = { $gt: lastId };
    }

    const results = await AnimeList.find(query)
        .sort({ _id: 1 })
        .limit(limit)
        .lean();

    return {
        data: results,
        nextCursor: results.length === limit ? results[results.length - 1]._id : null
    };
}

// ============================================
// 6. AGGREGATION PIPELINE OPTIMIZATION
// ============================================

// Example: Get user stats efficiently
async function getUserStats(userId) {
    const stats = await AnimeList.aggregate([
        { $match: { userId: new mongoose.Types.ObjectId(userId) } },
        {
            $project: {
                watching: { $size: '$watching' },
                completed: { $size: '$completed' },
                planToWatch: { $size: '$planToWatch' },
                dropped: { $size: '$dropped' },
                totalEpisodes: {
                    $sum: {
                        $map: {
                            input: '$completed',
                            as: 'anime',
                            in: '$$anime.episodes'
                        }
                    }
                },
                avgRating: {
                    $avg: {
                        $map: {
                            input: '$completed',
                            as: 'anime',
                            in: '$$anime.rating'
                        }
                    }
                }
            }
        }
    ]);

    return stats[0] || {};
}

// ============================================
// 7. BULK OPERATIONS
// ============================================

// BAD: Multiple individual updates
for (const anime of animeList) {
    await AnimeList.updateOne(
        { userId, 'watching.animeId': anime.id },
        { $set: { 'watching.$.progress': anime.progress } }
    );
}

// GOOD: Bulk write operation
const bulkOps = animeList.map(anime => ({
    updateOne: {
        filter: { userId, 'watching.animeId': anime.id },
        update: { $set: { 'watching.$.progress': anime.progress } }
    }
}));

await AnimeList.bulkWrite(bulkOps);

// ============================================
// 8. CONNECTION POOL CONFIGURATION
// ============================================

mongoose.connect(process.env.MONGO_URI, {
    // Connection pool settings
    maxPoolSize: 10,        // Max connections in pool
    minPoolSize: 2,         // Min connections to maintain
    maxIdleTimeMS: 30000,   // Close idle connections after 30s

    // Timeout settings
    serverSelectionTimeoutMS: 5000,  // Fail fast if can't connect
    socketTimeoutMS: 45000,          // Close sockets after 45s inactivity

    // Retry settings
    retryWrites: true,
    retryReads: true,

    // Other optimizations
    compressors: ['zlib'],  // Compress network traffic
    zlibCompressionLevel: 6,

    // Read preference for scaling
    readPreference: 'secondaryPreferred', // Use replicas when available

    // Write concern
    w: 'majority',          // Wait for majority of replicas
    wtimeoutMS: 5000        // Timeout for write concern
});

// ============================================
// 9. MONITORING QUERIES
// ============================================

// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
        console.log(`${collectionName}.${method}`, JSON.stringify(query), doc);
    });
}

// Monitor slow queries
mongoose.connection.on('connected', () => {
    mongoose.connection.db.admin().command({
        profile: 2,  // Log all operations
        slowms: 100  // Log queries slower than 100ms
    });
});

// ============================================
// 10. SHARDING PREPARATION
// ============================================

// For horizontal scaling, prepare for sharding:

// Shard key for AnimeList (by userId)
// This allows distributing user data across shards
db.adminCommand({
    shardCollection: "animeApp.animelists",
    key: { userId: 1 }
});

// Shard key for Users (by _id)
db.adminCommand({
    shardCollection: "animeApp.users",
    key: { _id: "hashed" }  // Hashed for even distribution
});

// ============================================
// 11. BACKUP STRATEGY
// ============================================

/*
PRODUCTION BACKUP STRATEGY:

1. Automated Daily Backups:
   - Use MongoDB Atlas automated backups
   - Or use mongodump with cron:
     0 2 * * * mongodump --uri="$MONGO_URI" --out=/backups/$(date +\%Y\%m\%d)

2. Point-in-Time Recovery:
   - Enable oplog on replica set
   - Allows recovery to any point in time

3. Backup Retention:
   - Daily: Keep 7 days
   - Weekly: Keep 4 weeks
   - Monthly: Keep 12 months

4. Test Restores:
   - Monthly restore tests to verify backups
*/

// ============================================
// 12. MONITORING & ALERTS
// ============================================

// Add MongoDB monitoring endpoint
app.get('/api/admin/db-stats', async (req, res) => {
    try {
        const stats = await mongoose.connection.db.stats();
        const collections = await mongoose.connection.db.listCollections().toArray();

        const collectionStats = await Promise.all(
            collections.map(async (col) => {
                const colStats = await mongoose.connection.db.collection(col.name).stats();
                return {
                    name: col.name,
                    count: colStats.count,
                    size: colStats.size,
                    avgObjSize: colStats.avgObjSize,
                    storageSize: colStats.storageSize,
                    indexes: colStats.nindexes
                };
            })
        );

        res.json({
            database: stats.db,
            collections: stats.collections,
            dataSize: stats.dataSize,
            indexSize: stats.indexSize,
            storageSize: stats.storageSize,
            details: collectionStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// 13. MIGRATION SCRIPT
// ============================================

// Create indexes on existing database
async function createIndexes() {
    console.log('Creating database indexes...');

    try {
        // User indexes
        await User.collection.createIndex({ email: 1 }, { unique: true });
        await User.collection.createIndex({ googleId: 1 }, { sparse: true });
        await User.collection.createIndex({ createdAt: -1 });

        // AnimeList indexes
        await AnimeList.collection.createIndex({ userId: 1 });
        await AnimeList.collection.createIndex({ userId: 1, 'watching.animeId': 1 });
        await AnimeList.collection.createIndex({ userId: 1, 'completed.animeId': 1 });

        console.log('✅ Indexes created successfully');
    } catch (error) {
        console.error('❌ Error creating indexes:', error);
    }
}

// Run on startup (only once)
mongoose.connection.once('open', async () => {
    if (process.env.CREATE_INDEXES === 'true') {
        await createIndexes();
    }
});

// ============================================
// PERFORMANCE CHECKLIST
// ============================================

/*
✅ Indexes on all frequently queried fields
✅ Compound indexes for common query patterns
✅ Projection to fetch only needed fields
✅ .lean() for read-only queries
✅ Pagination for large result sets
✅ Bulk operations instead of loops
✅ Aggregation pipelines for complex queries
✅ Connection pooling configured
✅ Query monitoring enabled
✅ Sharding strategy planned
✅ Backup strategy implemented
✅ Monitoring and alerts set up
*/

export { getUserStats, getAnimePaginated, createIndexes };
