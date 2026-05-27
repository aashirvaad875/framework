import { describe, it, expect } from 'vitest';
import {
  PluginException,
  PluginNotFoundError,
  PluginLoadError,
  CircularDependencyError,
} from '../exceptions.js';

describe('PluginException', () => {
  it('should create plugin exceptions with message and code', () => {
    const error = new PluginException('Test error', 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.name).toBe('PluginException');
  });
});

describe('PluginNotFoundError', () => {
  it('should indicate missing plugin', () => {
    const error = new PluginNotFoundError('missing-plugin');
    expect(error.message).toContain('missing-plugin');
    expect(error.code).toBe('PLUGIN_NOT_FOUND');
  });
});

describe('PluginLoadError', () => {
  it('should include cause error message', () => {
    const cause = new Error('Failed to load module');
    const error = new PluginLoadError('my-plugin', cause);
    expect(error.message).toContain('my-plugin');
    expect(error.message).toContain('Failed to load module');
  });
});

describe('CircularDependencyError', () => {
  it('should show dependency cycle path', () => {
    const cycle = ['plugin-a', 'plugin-b', 'plugin-c', 'plugin-a'];
    const error = new CircularDependencyError(cycle);
    expect(error.message).toContain('plugin-a');
    expect(error.message).toContain('plugin-b');
  });
});
