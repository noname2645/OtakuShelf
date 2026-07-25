const cache = new Map();
const timestamps = new Map();
const maxSize = 1000;
let cleanupInterval = null;

function startCleanup(intervalMs = 60000) {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, expires] of timestamps) {
      if (now > expires) {
        cache.delete(key);
        timestamps.delete(key);
      }
    }
    if (cache.size > maxSize) {
      const keysToDelete = [...timestamps.entries()]
        .sort((a, b) => a[1] - b[1])
        .slice(0, cache.size - maxSize)
        .map(([key]) => key);
      for (const key of keysToDelete) {
        cache.delete(key);
        timestamps.delete(key);
      }
    }
  }, intervalMs);
}

function get(key) {
  const now = Date.now();
  const expires = timestamps.get(key);
  if (!expires) return null;
  if (now > expires) {
    cache.delete(key);
    timestamps.delete(key);
    return null;
  }
  return cache.get(key);
}

function set(key, value, ttlMs) {
  if (cache.size >= maxSize) {
    const oldest = [...timestamps.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) {
      cache.delete(oldest[0]);
      timestamps.delete(oldest[0]);
    }
  }
  cache.set(key, value);
  timestamps.set(key, Date.now() + ttlMs);
}

function del(key) {
  cache.delete(key);
  timestamps.delete(key);
}

function delPattern(pattern) {
  const regex = new RegExp(pattern);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
      timestamps.delete(key);
    }
  }
}

function flush() {
  cache.clear();
  timestamps.clear();
}

function wrap(key, ttlMs, fetchFn) {
  const cached = get(key);
  if (cached !== null) return Promise.resolve(cached);
  return fetchFn().then(value => {
    set(key, value, ttlMs);
    return value;
  });
}

function respondWithCache(req, res, key, ttlMs, fetchFn) {
  const cached = get(key);
  if (cached !== null) {
    return Promise.resolve(res.sendSuccess('Cached response', cached));
  }
  return fetchFn(req, res).then(data => {
    if (data !== undefined) {
      set(key, data, ttlMs);
    }
    return data;
  });
}

function getCacheStats() {
  return {
    size: cache.size,
    maxSize,
    keys: [...cache.keys()],
  };
}

startCleanup();

export { get, set, del, delPattern, flush, wrap, respondWithCache, getCacheStats };
