export class ModuleCompilationError extends Error {
  constructor(
    message: string,
    public module: Function,
    public code: string,
  ) {
    super(message);
    this.name = 'ModuleCompilationError';
  }
}

export class CircularDependencyError extends ModuleCompilationError {
  constructor(
    public cycle: Function[],
  ) {
    const moduleNames = cycle.map(m => m.name).join(' → ');
    super(`Circular module dependency detected: ${moduleNames} → ${cycle[0].name}`, cycle[0], 'CIRCULAR_DEPENDENCY');
    this.name = 'CircularDependencyError';
  }
}

export class ModuleNotFoundError extends ModuleCompilationError {
  constructor(
    module: Function,
    public requiredModule: Function,
  ) {
    super(`Module ${requiredModule.name} not found when loading ${module.name}`, module, 'MODULE_NOT_FOUND');
    this.name = 'ModuleNotFoundError';
  }
}

export class ProviderAccessError extends ModuleCompilationError {
  constructor(
    module: Function,
    public provider: string | symbol | Function,
    public source: Function,
  ) {
    super(
      `Provider ${String(provider)} from ${source.name} is not exported and cannot be accessed by ${module.name}`,
      module,
      'PROVIDER_NOT_EXPORTED'
    );
    this.name = 'ProviderAccessError';
  }
}

export class InvalidModuleError extends ModuleCompilationError {
  constructor(
    module: Function,
    public issues: string[],
  ) {
    super(`Module ${module.name} has invalid configuration: ${issues.join('; ')}`, module, 'INVALID_MODULE');
    this.name = 'InvalidModuleError';
  }
}

export class DuplicateProviderError extends ModuleCompilationError {
  constructor(
    module: Function,
    public provider: string | symbol,
    public existingModule: Function,
  ) {
    super(
      `Provider ${String(provider)} is already registered by ${existingModule.name}`,
      module,
      'DUPLICATE_PROVIDER'
    );
    this.name = 'DuplicateProviderError';
  }
}

export class ProviderResolutionError extends ModuleCompilationError {
  constructor(
    module: Function,
    public provider: string | symbol,
    public reason: string,
  ) {
    super(`Failed to resolve provider ${String(provider)}: ${reason}`, module, 'PROVIDER_RESOLUTION_ERROR');
    this.name = 'ProviderResolutionError';
  }
}

export const ModuleErrors = {
  ModuleCompilationError,
  CircularDependencyError,
  ModuleNotFoundError,
  ProviderAccessError,
  InvalidModuleError,
  DuplicateProviderError,
  ProviderResolutionError,
};
