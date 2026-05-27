/**
 * Statistics about the buffer pool
 */
export interface PoolStats {
  totalAcquired: number;
  totalReleased: number;
  buffersSizes: number[];
}

/**
 * BufferPool provides efficient pre-allocated buffer pooling for request/response handling.
 *
 * Features:
 * - Pre-defined size classes: [256, 1024, 4096, 16384, 65536]
 * - Automatic size matching to appropriate pool
 * - Configurable pool size limit
 * - Statistics tracking
 * - Automatic reuse of released buffers
 */
export class BufferPool {
  // Pre-defined size classes for pooling
  private static readonly SIZE_CLASSES = [256, 1024, 4096, 16384, 65536];

  private pools: Map<number, Buffer[]> = new Map();
  private maxPoolSize: number;
  private totalAcquired: number = 0;
  private totalReleased: number = 0;
  private acquiredSizes: Set<number> = new Set();

  constructor(maxPoolSize: number = 100) {
    this.maxPoolSize = maxPoolSize;

    // Initialize pools for each size class
    for (const size of BufferPool.SIZE_CLASSES) {
      this.pools.set(size, []);
    }
  }

  /**
   * Acquire a buffer of the requested size.
   * Returns a buffer from the pool if available, otherwise allocates a new one.
   */
  acquire(size: number): Buffer {
    const appropriateSize = this.findAppropriateSize(size);
    const pool = this.pools.get(appropriateSize);

    let buffer: Buffer;
    if (pool && pool.length > 0) {
      // Reuse buffer from pool
      buffer = pool.pop()!;
    } else {
      // Allocate new buffer
      buffer = Buffer.allocUnsafe(appropriateSize);
    }

    this.totalAcquired++;
    this.acquiredSizes.add(appropriateSize);

    return buffer;
  }

  /**
   * Release a buffer back to the pool for reuse.
   * Buffer is only added back if pool is not at max capacity.
   */
  release(buffer: Buffer): void {
    const size = this.findAppropriateSize(buffer.length);
    const pool = this.pools.get(size);

    if (pool && pool.length < this.maxPoolSize) {
      pool.push(buffer);
      this.totalReleased++;
    }
  }

  /**
   * Get the number of available buffers for a specific size.
   */
  availableBuffers(size: number): number {
    const appropriateSize = this.findAppropriateSize(size);
    const pool = this.pools.get(appropriateSize);
    return pool ? pool.length : 0;
  }

  /**
   * Get statistics about the pool.
   */
  stats(): PoolStats {
    const buffersSizes = Array.from(this.acquiredSizes).sort((a, b) => a - b);

    return {
      totalAcquired: this.totalAcquired,
      totalReleased: this.totalReleased,
      buffersSizes,
    };
  }

  /**
   * Clear all pools and reset statistics.
   */
  clear(): void {
    // Clear all pools
    for (const pool of this.pools.values()) {
      pool.length = 0;
    }

    // Reset statistics
    this.totalAcquired = 0;
    this.totalReleased = 0;
    this.acquiredSizes.clear();
  }

  /**
   * Find the appropriate size class for the requested size.
   * Returns the smallest size class that can accommodate the requested size.
   * For sizes larger than the largest class, returns the requested size.
   */
  private findAppropriateSize(requestedSize: number): number {
    for (const size of BufferPool.SIZE_CLASSES) {
      if (requestedSize <= size) {
        return size;
      }
    }

    // If larger than largest class, return exact size
    return requestedSize;
  }
}
