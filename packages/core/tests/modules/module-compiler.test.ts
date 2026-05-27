import { describe, it, expect, beforeEach } from 'vitest';
import { Module } from '../../src/module.js';
import { ModuleCompiler } from '../../src/modules/compiler/module-compiler.js';
import { MODULE_METADATA_KEY } from '../../src/modules/metadata/module-metadata.js';

describe('ModuleCompiler', () => {
  let compiler: ModuleCompiler;

  beforeEach(() => {
    compiler = new ModuleCompiler();
  });

  it('should compile valid modules', async () => {
    @Module({ providers: [], controllers: [] })
    class TestModule {}

    const result = await compiler.compile([TestModule]);

    expect(result.success).toBe(true);
    expect(result.modules.has(TestModule)).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect circular dependencies', async () => {
    @Module({ imports: [] })
    class ModuleA {}

    @Module({ imports: [] })
    class ModuleB {}

    // Manually set up circular dependency
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: [],
      providers: [],
      imports: [ModuleB],
      exports: [],
    }, ModuleA);

    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: [],
      providers: [],
      imports: [ModuleA],
      exports: [],
    }, ModuleB);

    const result = await compiler.compile([ModuleA]);

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.type === 'circular-dependency')).toBe(true);
  });

  it('should validate missing @Module decorator', async () => {
    class NoDecorator {}

    const result = await compiler.compile([NoDecorator]);

    expect(result.success).toBe(false);
    expect(result.errors.some(e => e.type === 'missing-decorator')).toBe(true);
  });

  it('should provide correct load order', async () => {
    @Module({ imports: [] })
    class ModuleC {}

    @Module({ imports: [] })
    class ModuleB {}

    @Module({ imports: [] })
    class ModuleA {}

    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: [],
      providers: [],
      imports: [],
      exports: [],
    }, ModuleC);

    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: [],
      providers: [],
      imports: [ModuleC],
      exports: [],
    }, ModuleB);

    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      controllers: [],
      providers: [],
      imports: [ModuleB],
      exports: [],
    }, ModuleA);

    const result = await compiler.compile([ModuleA]);

    expect(result.loadOrder).toEqual([ModuleC, ModuleB, ModuleA]);
  });

  it('should support global modules', async () => {
    @Module({
      providers: [],
      isGlobal: true,
    })
    class GlobalModule {}

    const result = await compiler.compile([GlobalModule]);

    const module = result.modules.get(GlobalModule);
    expect(module?.isGlobal).toBe(true);
  });

  it('should support lazy modules', async () => {
    @Module({
      providers: [],
      lazy: {
        strategy: 'route-based',
        routes: ['/admin/*'],
      },
    })
    class LazyModule {}

    const result = await compiler.compile([LazyModule]);

    const module = result.modules.get(LazyModule);
    expect(module?.isLazy).toBe(true);
  });
});
