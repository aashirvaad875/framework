// Route and parameter metadata
export interface ParameterMetadata {
  name: string;
  source: 'param' | 'query' | 'header' | 'body';
  type: Function;
  required: boolean;
}

export interface RouteMetadata {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handlerName: string;
  parameters: ParameterMetadata[];
  bodyType?: Function;
  returnType?: Function;
  security?: SecurityRequirement;
}

export interface ControllerMetadata {
  controllerClass: Function;
  controllerPath: string;
  routes: RouteMetadata[];
}

export interface SecurityRequirement {
  scheme: string;
  scopes?: string[];
}

// Schema and DTO types
export type JSONSchema = {
  type?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  required?: string[];
  format?: string;
  description?: string;
  $ref?: string;
  enum?: any[];
  minimum?: number;
  maximum?: number;
  [key: string]: any;
};

export type DTOSchemaMap = Map<string, JSONSchema>;

// Configuration types
export interface SwaggerModuleConfig {
  title: string;
  version: string;
  description?: string;
  contactInfo?: {
    name?: string;
    email?: string;
    url?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  securitySchemes?: Record<string, SecurityScheme>;
}

export interface SecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2';
  scheme?: string;
  bearerFormat?: string;
  in?: 'header' | 'query' | 'cookie';
  name?: string;
  description?: string;
}

// OpenAPI 3.1 spec types
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, Record<string, any>>;
  components?: {
    schemas?: Record<string, JSONSchema>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  security?: Array<Record<string, string[]>>;
}

// Joi schema conversion interface
export interface JoiSchema {
  describe: () => {
    type: string;
    flags?: { presence?: string };
    rules?: Array<{ name: string; args?: any }>;
    items?: JoiSchema[];
    keys?: Record<string, JoiSchema>;
    prefs?: any;
  };
}

// Zod schema conversion interface
export interface ZodSchema {
  _def: {
    typeName: string;
    shape?: Record<string, ZodSchema>;
    items?: ZodSchema;
  };
}
