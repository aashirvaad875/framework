import { describe, it, expect } from 'vitest';
import { Module } from '../../src/module.js';
import { DynamicModuleBuilder } from '../../src/modules/dynamic.js';
import type { DynamicModule } from '../../src/modules/types.js';
import { MODULE_METADATA_KEY } from '../../src/modules/metadata/module-metadata.js';

describe('Dynamic Modules', () => {
  it('should support forRoot pattern', () => {
    @Module({
      providers: [],
      exports: [],
    })
    class ConfigModule {
      static forRoot(config: any): DynamicModule {
        return DynamicModuleBuilder.forRoot(ConfigModule, [
          { provide: 'CONFIG', useValue: config },
        ], ['CONFIG']);
      }
    }

    const dynamicModule = ConfigModule.forRoot({ apiUrl: 'http://localhost' });

    expect(dynamicModule.module).toBe(ConfigModule);
    expect(dynamicModule.providers).toHaveLength(1);
    expect(dynamicModule.exports).toContain('CONFIG');
  });

  it('should support forFeature pattern', () => {
    @Module({
      providers: [],
      exports: [],
    })
    class DatabaseModule {
      static forFeature(entity: any): DynamicModule {
        return DynamicModuleBuilder.forFeature(DatabaseModule, [
          { provide: `${entity.name}Repository`, useValue: {} },
        ]);
      }
    }

    const dynamicModule = DatabaseModule.forFeature({ name: 'User' });

    expect(dynamicModule.providers).toHaveLength(1);
    expect((dynamicModule.providers?.[0] as any).provide).toBe('UserRepository');
  });

  it('should support lazy loading configuration', () => {
    @Module({
      providers: [],
      lazy: {
        strategy: 'route-based',
        routes: ['/admin/*'],
      },
    })
    class AdminModule {}

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, AdminModule);
    expect(metadata.lazy?.strategy).toBe('route-based');
    expect(metadata.lazy?.routes).toContain('/admin/*');
  });

  it('should support global modules', () => {
    @Module({
      providers: [],
      isGlobal: true,
    })
    class GlobalModule {}

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, GlobalModule);
    expect(metadata.isGlobal).toBe(true);
  });

  it('should merge multiple dynamic modules', () => {
    const module1: DynamicModule = {
      module: class M1 {},
      providers: [{ provide: 'A', useValue: 1 }],
      exports: ['A'],
    };

    const module2: DynamicModule = {
      module: class M2 {},
      providers: [{ provide: 'B', useValue: 2 }],
      exports: ['B'],
    };

    const merged = DynamicModuleBuilder.merge(module1, module2);

    expect(merged.providers).toHaveLength(2);
    expect(merged.exports).toHaveLength(2);
  });
});
