import { describe, it, expect, beforeEach } from 'vitest';
import { MemoizationCache } from '../layer2/memoization-cache.js';
import type { Token } from '../../di/types.js';

describe('MemoizationCache', () => {
  let memoCache: MemoizationCache;

  beforeEach(() => {
    memoCache = new MemoizationCache();
  });

  describe('Basic Operations', () => {
    it('should set and get values in current scope', async () => {
      const token: Token = 'UserService';
      const value = { id: 1, name: 'John' };

      await memoCache.runInScope(async () => {
        memoCache.set(token, value);
        const retrieved = memoCache.get(token);

        expect(retrieved).toEqual(value);
      });
    });

    it('should return undefined for non-existent keys', async () => {
      await memoCache.runInScope(async () => {
        const token: Token = 'NonExistent';
        const retrieved = memoCache.get(token);

        expect(retrieved).toBeUndefined();
      });
    });

    it('should check if token exists with has()', async () => {
      const token: Token = 'ExistingService';
      const value = { data: 'test' };

      await memoCache.runInScope(async () => {
        expect(memoCache.has(token)).toBe(false);

        memoCache.set(token, value);
        expect(memoCache.has(token)).toBe(true);
      });
    });
  });

  describe('Scope Isolation', () => {
    it('should not persist values outside scope', async () => {
      const token: Token = 'ScopedService';
      const value = { id: 1 };

      await memoCache.runInScope(async () => {
        memoCache.set(token, value);
        expect(memoCache.get(token)).toEqual(value);
      });

      // Outside the scope, value should not be accessible
      expect(memoCache.get(token)).toBeUndefined();
    });

    it('should fail to access values set in previous scope', async () => {
      const token: Token = 'ServiceA';

      // First scope
      await memoCache.runInScope(async () => {
        memoCache.set(token, { scope: 1 });
      });

      // Second scope - should not have access to values from first scope
      await memoCache.runInScope(async () => {
        expect(memoCache.get(token)).toBeUndefined();
      });
    });

    it('should support multiple concurrent scopes', async () => {
      const token1: Token = 'Service1';
      const token2: Token = 'Service2';

      const promise1 = memoCache.runInScope(async () => {
        memoCache.set(token1, { scope: 1 });
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 10));
        return memoCache.get(token1);
      });

      const promise2 = memoCache.runInScope(async () => {
        memoCache.set(token2, { scope: 2 });
        // Simulate async work
        await new Promise(resolve => setTimeout(resolve, 5));
        return memoCache.get(token2);
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual({ scope: 1 });
      expect(result2).toEqual({ scope: 2 });
    });
  });

  describe('Nested Scopes', () => {
    it('should support nested scopes independently', async () => {
      const token: Token = 'NestedService';

      await memoCache.runInScope(async () => {
        memoCache.set(token, { level: 'outer' });

        await memoCache.runInScope(async () => {
          // Inner scope should not see outer scope values
          expect(memoCache.get(token)).toBeUndefined();

          memoCache.set(token, { level: 'inner' });
          expect(memoCache.get(token)).toEqual({ level: 'inner' });
        });

        // After inner scope, outer scope should still have its value
        expect(memoCache.get(token)).toEqual({ level: 'outer' });
      });

      // Outside all scopes
      expect(memoCache.get(token)).toBeUndefined();
    });

    it('should maintain separate scopes at different nesting levels', async () => {
      const token: Token = 'NestedToken';

      await memoCache.runInScope(async () => {
        memoCache.set(token, 'level1');

        await memoCache.runInScope(async () => {
          memoCache.set(token, 'level2');

          await memoCache.runInScope(async () => {
            memoCache.set(token, 'level3');
            expect(memoCache.get(token)).toBe('level3');
          });

          expect(memoCache.get(token)).toBe('level2');
        });

        expect(memoCache.get(token)).toBe('level1');
      });
    });
  });

  describe('Token-based Keys', () => {
    it('should support string tokens', async () => {
      const token: Token = 'StringToken';
      const value = 'stringValue';

      await memoCache.runInScope(async () => {
        memoCache.set(token, value);
        expect(memoCache.get(token)).toBe(value);
      });
    });

    it('should support symbol tokens', async () => {
      const token: Token = Symbol('SymbolToken');
      const value = { id: 123 };

      await memoCache.runInScope(async () => {
        memoCache.set(token, value);
        expect(memoCache.get(token)).toEqual(value);
      });
    });

    it('should support class tokens', async () => {
      class TestService {}
      const token: Token = TestService;
      const instance = new TestService();

      await memoCache.runInScope(async () => {
        memoCache.set(token, instance);
        expect(memoCache.get(token)).toBe(instance);
      });
    });

    it('should distinguish between different tokens', async () => {
      const token1: Token = 'Service1';
      const token2: Token = 'Service2';
      const value1 = { id: 1 };
      const value2 = { id: 2 };

      await memoCache.runInScope(async () => {
        memoCache.set(token1, value1);
        memoCache.set(token2, value2);

        expect(memoCache.get(token1)).toEqual(value1);
        expect(memoCache.get(token2)).toEqual(value2);
      });
    });
  });

  describe('Scope Management', () => {
    it('should return current scope when in scope', async () => {
      await memoCache.runInScope(async () => {
        const scope = memoCache.getCurrentScope();
        expect(scope).toBeDefined();
        expect(scope).toBeInstanceOf(Map);
      });
    });

    it('should return undefined outside scope', () => {
      const scope = memoCache.getCurrentScope();
      expect(scope).toBeUndefined();
    });

    it('should clear all values', async () => {
      const token1: Token = 'Token1';
      const token2: Token = 'Token2';

      await memoCache.runInScope(async () => {
        memoCache.set(token1, 'value1');
        memoCache.set(token2, 'value2');

        expect(memoCache.get(token1)).toBe('value1');
        expect(memoCache.get(token2)).toBe('value2');

        memoCache.clear();

        expect(memoCache.get(token1)).toBeUndefined();
        expect(memoCache.get(token2)).toBeUndefined();
        expect(memoCache.getCurrentScope()?.size).toBe(0);
      });
    });

    it('should return callback result from runInScope', async () => {
      const expectedResult = { success: true, data: 'test' };

      const result = await memoCache.runInScope(async () => {
        return expectedResult;
      });

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle multiple scopes sequentially', async () => {
      const token: Token = 'SequentialService';

      // First scope
      const result1 = await memoCache.runInScope(async () => {
        memoCache.set(token, { iteration: 1 });
        return memoCache.get(token);
      });

      expect(result1).toEqual({ iteration: 1 });

      // Second scope - should start fresh
      const result2 = await memoCache.runInScope(async () => {
        memoCache.set(token, { iteration: 2 });
        return memoCache.get(token);
      });

      expect(result2).toEqual({ iteration: 2 });

      // Value should not persist
      expect(memoCache.get(token)).toBeUndefined();
    });

    it('should handle exceptions within scope', async () => {
      const token: Token = 'ErrorService';

      try {
        await memoCache.runInScope(async () => {
          memoCache.set(token, { data: 'test' });
          throw new Error('Test error');
        });
      } catch (error) {
        // Error should be caught
        expect((error as Error).message).toBe('Test error');
      }

      // Outside scope, value should not persist
      expect(memoCache.get(token)).toBeUndefined();
    });

    it('should support different value types', async () => {
      const stringToken: Token = 'string';
      const numberToken: Token = 'number';
      const objectToken: Token = 'object';
      const arrayToken: Token = 'array';
      const nullToken: Token = 'null';

      await memoCache.runInScope(async () => {
        memoCache.set(stringToken, 'string value');
        memoCache.set(numberToken, 42);
        memoCache.set(objectToken, { key: 'value' });
        memoCache.set(arrayToken, [1, 2, 3]);
        memoCache.set(nullToken, null);

        expect(memoCache.get(stringToken)).toBe('string value');
        expect(memoCache.get(numberToken)).toBe(42);
        expect(memoCache.get(objectToken)).toEqual({ key: 'value' });
        expect(memoCache.get(arrayToken)).toEqual([1, 2, 3]);
        expect(memoCache.get(nullToken)).toBeNull();
      });
    });
  });
});
