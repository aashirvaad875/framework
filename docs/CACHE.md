# Enterprise Cache System

The framework provides a flexible caching system supporting multiple backends (Redis, In-Memory) with decorators, TTL management, and automatic invalidation.

## Features

- **Multiple Backends** - Redis for distributed caching, Memory for single-process
- **Automatic Caching** - @Cacheable decorator for method-level caching
- **Cache Invalidation** - @CacheInvalidate and @CacheClear decorators
- **HTTP Caching** - CacheInterceptor for automatic GET response caching
- **TTL Management** - Per-entry and default TTL configuration
- **Batch Operations** - Set/get multiple items at once
- **Cache Statistics** - Hits, misses, evictions, size tracking
- **Key Generation** - Automatic key generation from method parameters
- **Remember Pattern** - Get-or-fetch utility for lazy loading

## Quick Start

```typescript
import { CacheManager, Cacheable } from '@framework/core';

// Create cache manager
const cache = CacheManager.createMemory({ ttl: 3600 });

// Method caching
class UserService {
  @Cacheable({ ttl: 1800 })
  async getUser(id: string) {
    return await database.user.findById(id);
  }
}

// Manual caching
const user = await cache.remember('user:123', async () => {
  return await database.user.findById('123');
}, 3600);
```

## Cache Backends

### Memory Cache

Best for: Single-process applications, development, low-scale deployments

```typescript
const cache = CacheManager.createMemory({
  ttl: 3600,
  maxSize: 1000,
  strategy: 'LRU',
});
```

**LRU Strategy:** Least Recently Used items are evicted first when cache is full.
**FIFO Strategy:** First In First Out items are evicted when cache is full.

### Redis Cache

Best for: Distributed systems, microservices, high-scale deployments

```typescript
const cache = CacheManager.createRedis({
  ttl: 3600,
  host: 'localhost',
  port: 6379,
});

await cache.connect();
```

## Decorators

### @Cacheable

Automatically cache method return value.

```typescript
@Cacheable({ ttl: 1800 })
async getUser(id: string) { }

@Cacheable({
  key: (id: string) => `user:${id}`,
  condition: (id: string) => id.startsWith('user_'),
})
async getUserProfile(id: string) { }
```

Options:
- `ttl`: Time to live in seconds
- `key`: Custom cache key or function to generate key
- `condition`: Function that determines whether to cache

### @CacheInvalidate

Invalidate cache entry after method execution.

```typescript
@CacheInvalidate({ key: (id: string) => `user:${id}` })
async updateUser(id: string, data: any) { }
```

### @CacheClear

Clear all cache entries.

```typescript
@CacheClear()
async deleteAllUsers() { }
```

## Cache Operations

### Get/Set

```typescript
await cache.get<User>('user:123');
await cache.set('user:123', user, 3600);
await cache.exists('user:123');
await cache.del('user:123');
```

### Batch Operations

```typescript
const users = await cache.getMany(['user:1', 'user:2']);

await cache.setMany([
  { key: 'user:1', value: user1 },
  { key: 'user:2', value: user2 },
]);

await cache.delMany(['user:1', 'user:2']);
```

### Counters

```typescript
await cache.increment('views:article:123');
await cache.decrement('downloads:file:456', 2);
```

### Remember Pattern

Get from cache or fetch and store:

```typescript
const user = await cache.remember('user:123', async () => {
  return await fetchUser('123');
}, 3600);

// Batch version
const users = await cache.rememberMany(
  ['user:1', 'user:2', 'user:3'],
  async (missingKeys) => {
    const fetched = await fetchUsers(missingKeys);
    return new Map(fetched.map((u) => [u.id, u]));
  },
  3600
);
```

## Statistics

```typescript
const stats = await cache.getStats();
// { hits: 100, misses: 25, evictions: 5, size: 500 }
```

## Configuration

Environment variables:
- `REDIS_HOST` - Redis server host (default: localhost)
- `REDIS_PORT` - Redis server port (default: 6379)
- `REDIS_PASSWORD` - Redis authentication password
- `CACHE_TTL` - Default TTL in seconds (default: 3600)

## Module Integration

```typescript
const cacheModule = CacheModule({
  type: 'redis',
  redisConfig: {
    host: 'redis-server',
    port: 6379,
  },
  global: true,
});

// Or with builder
const module = new CacheModuleBuilder()
  .setType('redis')
  .setRedisConfig({ host: 'redis-server' })
  .setGlobal(true)
  .build();
```

## Best Practices

1. **Use appropriate TTLs** - Balance freshness vs performance
2. **Key naming** - Use consistent, descriptive key patterns
3. **Conditional caching** - Only cache when appropriate
4. **Cache warming** - Pre-load frequently accessed data
5. **Monitor hit rates** - Track cache effectiveness
6. **Handle failures** - Redis unavailability shouldn't break app
