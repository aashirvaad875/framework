import { describe, it, expect, beforeEach } from 'vitest';
import { BufferPool } from '../layer2/buffer-pool.js';

describe('BufferPool', () => {
  let pool: BufferPool;

  beforeEach(() => {
    pool = new BufferPool();
  });

  describe('Basic Operations', () => {
    it('should acquire a buffer', () => {
      const buffer = pool.acquire(256);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThanOrEqual(256);
    });

    it('should acquire buffers of different sizes', () => {
      const buffer256 = pool.acquire(256);
      const buffer1024 = pool.acquire(1024);
      const buffer4096 = pool.acquire(4096);

      expect(buffer256.length).toBeGreaterThanOrEqual(256);
      expect(buffer1024.length).toBeGreaterThanOrEqual(1024);
      expect(buffer4096.length).toBeGreaterThanOrEqual(4096);
    });

    it('should return undefined for non-existent size pool', () => {
      const available = pool.availableBuffers(256);
      expect(available).toBe(0);
    });
  });

  describe('Buffer Pooling', () => {
    it('should reuse released buffers', () => {
      const buffer1 = pool.acquire(256);

      pool.release(buffer1);

      const buffer2 = pool.acquire(256);
      // Should reuse the same buffer
      expect(buffer2).toBe(buffer1);
    });

    it('should track available buffers after release', () => {
      expect(pool.availableBuffers(256)).toBe(0);

      const buffer = pool.acquire(256);
      pool.release(buffer);

      expect(pool.availableBuffers(256)).toBe(1);
    });

    it('should handle multiple buffers of same size', () => {
      const buffer1 = pool.acquire(1024);
      const buffer2 = pool.acquire(1024);
      const buffer3 = pool.acquire(1024);

      expect(pool.availableBuffers(1024)).toBe(0);

      pool.release(buffer1);
      pool.release(buffer2);
      pool.release(buffer3);

      expect(pool.availableBuffers(1024)).toBe(3);
    });

    it('should not exceed maxPoolSize', () => {
      const smallPool = new BufferPool(3);

      const buffer1 = smallPool.acquire(256);
      const buffer2 = smallPool.acquire(256);
      const buffer3 = smallPool.acquire(256);

      smallPool.release(buffer1);
      smallPool.release(buffer2);
      smallPool.release(buffer3);

      // Pool can only hold 3 buffers total
      const stats = smallPool.stats();
      expect(stats.totalReleased).toBeLessThanOrEqual(3);
    });
  });

  describe('Size Classes', () => {
    it('should allocate buffers matching size classes', () => {
      const sizeClasses = [256, 1024, 4096, 16384, 65536];

      for (const size of sizeClasses) {
        const buffer = pool.acquire(size);
        expect(buffer.length).toBeGreaterThanOrEqual(size);
      }
    });

    it('should use smallest appropriate size class', () => {
      const buffer = pool.acquire(500);
      // Should be allocated from 1024 class
      expect(buffer.length).toBeGreaterThanOrEqual(1024);
    });

    it('should handle size smaller than smallest class', () => {
      const buffer = pool.acquire(100);
      // Should use smallest class (256)
      expect(buffer.length).toBeGreaterThanOrEqual(256);
    });

    it('should handle size larger than largest class', () => {
      const buffer = pool.acquire(100000);
      // Should allocate exact size
      expect(buffer.length).toBeGreaterThanOrEqual(100000);
    });

    it('should maintain separate pools for different sizes', () => {
      const buffer256 = pool.acquire(256);
      const buffer1024 = pool.acquire(1024);
      const buffer4096 = pool.acquire(4096);

      pool.release(buffer256);
      pool.release(buffer1024);
      pool.release(buffer4096);

      expect(pool.availableBuffers(256)).toBe(1);
      expect(pool.availableBuffers(1024)).toBe(1);
      expect(pool.availableBuffers(4096)).toBe(1);
    });
  });

  describe('Statistics', () => {
    it('should track total acquired', () => {
      pool.acquire(256);
      pool.acquire(1024);
      pool.acquire(4096);

      const stats = pool.stats();
      expect(stats.totalAcquired).toBe(3);
    });

    it('should track total released', () => {
      const buffer1 = pool.acquire(256);
      const buffer2 = pool.acquire(1024);

      pool.release(buffer1);
      pool.release(buffer2);

      const stats = pool.stats();
      expect(stats.totalReleased).toBe(2);
    });

    it('should track buffer sizes', () => {
      pool.acquire(256);
      pool.acquire(1024);
      pool.acquire(4096);

      const stats = pool.stats();
      expect(stats.buffersSizes).toContain(256);
      expect(stats.buffersSizes).toContain(1024);
      expect(stats.buffersSizes).toContain(4096);
    });

    it('should return PoolStats interface', () => {
      const buffer = pool.acquire(256);
      pool.release(buffer);

      const stats = pool.stats();
      expect(stats).toHaveProperty('totalAcquired');
      expect(stats).toHaveProperty('totalReleased');
      expect(stats).toHaveProperty('buffersSizes');
      expect(typeof stats.totalAcquired).toBe('number');
      expect(typeof stats.totalReleased).toBe('number');
      expect(Array.isArray(stats.buffersSizes)).toBe(true);
    });
  });

  describe('Pool Management', () => {
    it('should clear all pools', () => {
      const buffer1 = pool.acquire(256);
      const buffer2 = pool.acquire(1024);

      pool.release(buffer1);
      pool.release(buffer2);

      expect(pool.availableBuffers(256)).toBe(1);
      expect(pool.availableBuffers(1024)).toBe(1);

      pool.clear();

      expect(pool.availableBuffers(256)).toBe(0);
      expect(pool.availableBuffers(1024)).toBe(0);
    });

    it('should reset stats after clear', () => {
      const buffer = pool.acquire(256);
      pool.release(buffer);

      let stats = pool.stats();
      expect(stats.totalAcquired).toBeGreaterThan(0);

      pool.clear();

      stats = pool.stats();
      expect(stats.totalAcquired).toBe(0);
      expect(stats.totalReleased).toBe(0);
    });

    it('should support custom maxPoolSize', () => {
      const customPool = new BufferPool(5);

      const buffers = [];
      for (let i = 0; i < 3; i++) {
        buffers.push(customPool.acquire(256));
      }

      for (const buffer of buffers) {
        customPool.release(buffer);
      }

      const available = customPool.availableBuffers(256);
      expect(available).toBeLessThanOrEqual(5);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle acquire-release-acquire pattern', () => {
      const buffer1 = pool.acquire(256);
      const buffer1Content = Buffer.from('test data');
      buffer1.write(buffer1Content.toString());

      pool.release(buffer1);

      const buffer2 = pool.acquire(256);
      // Should be the same buffer instance
      expect(buffer2).toBe(buffer1);
      expect(buffer2.length).toBeGreaterThanOrEqual(256);
    });

    it('should handle mixed size acquisitions and releases', () => {
      const buffers = [];
      const sizes = [256, 1024, 4096, 256, 1024, 256];

      for (const size of sizes) {
        buffers.push(pool.acquire(size));
      }

      expect(pool.stats().totalAcquired).toBe(6);

      for (const buffer of buffers) {
        pool.release(buffer);
      }

      expect(pool.stats().totalReleased).toBe(6);
    });

    it('should accurately report buffersSizes for all acquired sizes', () => {
      const acquiredSizes = [256, 1024, 4096, 16384, 65536];

      for (const size of acquiredSizes) {
        pool.acquire(size);
      }

      const stats = pool.stats();
      for (const size of acquiredSizes) {
        expect(stats.buffersSizes).toContain(size);
      }
    });

    it('should handle stress test with many buffers', () => {
      const buffers = [];

      // Acquire many buffers
      for (let i = 0; i < 50; i++) {
        buffers.push(pool.acquire(256 + (i % 4) * 256));
      }

      expect(pool.stats().totalAcquired).toBe(50);

      // Release half
      for (let i = 0; i < 25; i++) {
        pool.release(buffers[i]);
      }

      expect(pool.stats().totalReleased).toBe(25);

      // Acquire more (some will reuse)
      for (let i = 0; i < 10; i++) {
        buffers.push(pool.acquire(256));
      }

      // Clear should remove all
      pool.clear();
      expect(pool.availableBuffers(256)).toBe(0);
    });
  });
});
