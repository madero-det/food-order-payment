import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 0, checkperiod: 120 });

export function getDashboardKey(isAdmin, userId, year, month) {
  return `dashboard:${isAdmin ? 'all' : userId}:${year}:${month}`;
}

export function getMonthlyKey(isAdmin, userId, year) {
  return `monthly:${isAdmin ? 'all' : userId}:${year}`;
}

export function getUnreadKey(userId) {
  return `unread:${userId}`;
}

export async function getOrSet(key, ttl, fetcher) {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const data = await fetcher();
  cache.set(key, data, ttl);
  return data;
}

export function deleteCacheKey(key) {
  cache.del(key);
}

// Alias for backwards compatibility
export const del = deleteCacheKey;

export function clearByPrefix(prefix) {
  const keys = cache.keys().filter(k => k.startsWith(prefix));
  if (keys.length) cache.del(keys);
}

export default cache;
