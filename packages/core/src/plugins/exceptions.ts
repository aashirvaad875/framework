export class PluginException extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'PluginException';
  }
}

export class PluginNotFoundError extends PluginException {
  constructor(pluginId: string) {
    super(`Plugin not found: ${pluginId}`, 'PLUGIN_NOT_FOUND');
    this.name = 'PluginNotFoundError';
  }
}

export class PluginLoadError extends PluginException {
  cause?: Error;

  constructor(pluginId: string, cause?: Error) {
    super(
      `Failed to load plugin ${pluginId}${cause ? ': ' + cause.message : ''}`,
      'PLUGIN_LOAD_ERROR'
    );
    this.name = 'PluginLoadError';
    this.cause = cause;
  }
}

export class PluginUnloadError extends PluginException {
  cause?: Error;

  constructor(pluginId: string, cause?: Error) {
    super(
      `Failed to unload plugin ${pluginId}${cause ? ': ' + cause.message : ''}`,
      'PLUGIN_UNLOAD_ERROR'
    );
    this.name = 'PluginUnloadError';
    this.cause = cause;
  }
}

export class CircularDependencyError extends PluginException {
  constructor(cycle: string[]) {
    const cyclePath = cycle.join(' → ');
    super(`Circular dependency detected: ${cyclePath}`, 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

export class PluginDependencyError extends PluginException {
  constructor(pluginId: string, missingDependency: string) {
    super(
      `Plugin ${pluginId} depends on ${missingDependency} which is not available`,
      'PLUGIN_DEPENDENCY_ERROR'
    );
    this.name = 'PluginDependencyError';
  }
}

export class InvalidPluginManifestError extends PluginException {
  constructor(pluginId: string, reason: string) {
    super(`Invalid plugin manifest for ${pluginId}: ${reason}`, 'INVALID_MANIFEST');
    this.name = 'InvalidPluginManifestError';
  }
}
