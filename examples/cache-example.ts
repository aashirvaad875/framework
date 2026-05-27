import {
  CacheManager,
  Cacheable,
  CacheInvalidate,
  CacheClear,
  CacheInterceptor,
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@framework/core';

// Example 1: Basic cache manager
const cacheManager = CacheManager.createMemory({
  ttl: 3600,
  namespace: 'app',
});

// Set and get
async function basicOperations() {
  await cacheManager.set('user:123', { id: 123, name: 'John' }, 3600);
  const user = await cacheManager.get('user:123');

  // Batch operations
  await cacheManager.setMany([
    { key: 'item:1', value: { id: 1 }, ttl: 3600 },
    { key: 'item:2', value: { id: 2 }, ttl: 3600 },
  ]);

  const items = await cacheManager.getMany(['item:1', 'item:2']);
  return { user, items };
}

// Example 2: @Cacheable decorator
class UserService {
  @Cacheable({ ttl: 3600 })
  async getUserById(id: string) {
    // Expensive database query
    return { id, name: 'John', email: 'john@example.com' };
  }

  @Cacheable({
    ttl: 1800,
    key: (userId: string) => `user:profile:${userId}`,
  })
  async getUserProfile(userId: string) {
    return { userId, profile: { bio: 'Developer' } };
  }

  @Cacheable({
    condition: (page: number) => page < 100,
  })
  async getUsers(page: number) {
    return { page, users: [] };
  }

  @CacheInvalidate({ key: (id: string) => `user:${id}` })
  async updateUser(id: string, data: any) {
    return { id, ...data };
  }

  @CacheClear()
  async deleteAllUsers() {
    return { success: true };
  }
}

// Example 3: Cache interceptor for GET endpoints
@Controller('/users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  async getUsers() {
    return this.userService.getUsers(1);
  }

  @Get('/:id')
  async getUser(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Post('/:id')
  async updateUser(@Param('id') id: string, @Body() data: any) {
    return this.userService.updateUser(id, data);
  }
}

// Example 4: Redis cache manager
async function redisExample() {
  const redisCache = CacheManager.createRedis({
    ttl: 3600,
    namespace: 'api',
  });

  await redisCache.connect();
  return redisCache;
}

// Example 5: Remember pattern
async function rememberExample() {
  const userData = await cacheManager.remember(
    'user:456',
    async () => {
      return { id: 456, name: 'Jane' };
    },
    3600
  );

  return userData;
}

// Example 6: Batch remember
async function batchRememberExample() {
  const users = await cacheManager.rememberMany(
    ['user:1', 'user:2', 'user:3'],
    async (missingKeys) => {
      const fetched = await Promise.all(
        missingKeys.map((key) => fetchUserByKey(key))
      );
      return new Map(fetched.map((u) => [u.id, u]));
    },
    3600
  );

  return users;
}

async function fetchUserByKey(key: string) {
  return { id: key, name: 'User' };
}

// Example 7: Cache stats
async function statsExample() {
  const stats = await cacheManager.getStats();
  console.log(`Cache: ${stats.hits} hits, ${stats.misses} misses, size: ${stats.size}`);
}

// Example 8: Increment/Decrement
async function counterExample() {
  await cacheManager.set('views:article:123', 100);
  await cacheManager.increment('views:article:123');
  await cacheManager.decrement('views:article:123', 5);
}
