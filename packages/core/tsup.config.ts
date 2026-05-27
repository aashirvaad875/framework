import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: false,
  sourcemap: true,
  clean: true,
  splitting: false,
  treeshake: true,
  external: ['reflect-metadata'],
  esbuildOptions(options) {
    options.define = {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    };
  },
});
