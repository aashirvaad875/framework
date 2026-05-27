export interface ErrorDetail {
  field?: string;
  message: string;
  type?: string;
  code?: string;
  value?: any;
}

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    details?: ErrorDetail[];
    context?: Record<string, any>;
  };
  path: string;
  method?: string;
  timestamp: string;
  traceId?: string;
  stack?: string[];
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version?: string;
    [key: string]: any;
  };
}

export class ErrorResponseBuilder {
  private response: Partial<ErrorResponse> = {
    success: false,
    error: {
      message: '',
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
    },
    path: '',
    timestamp: new Date().toISOString(),
  };

  setMessage(message: string): this {
    if (this.response.error) {
      this.response.error.message = message;
    }
    return this;
  }

  setCode(code: string): this {
    if (this.response.error) {
      this.response.error.code = code;
    }
    return this;
  }

  setStatusCode(statusCode: number): this {
    if (this.response.error) {
      this.response.error.statusCode = statusCode;
    }
    return this;
  }

  setPath(path: string): this {
    this.response.path = path;
    return this;
  }

  setMethod(method: string): this {
    this.response.method = method;
    return this;
  }

  setDetails(details: ErrorDetail[]): this {
    if (this.response.error) {
      this.response.error.details = details;
    }
    return this;
  }

  addDetail(detail: ErrorDetail): this {
    if (this.response.error) {
      if (!this.response.error.details) {
        this.response.error.details = [];
      }
      this.response.error.details.push(detail);
    }
    return this;
  }

  setContext(context: Record<string, any>): this {
    if (this.response.error) {
      this.response.error.context = context;
    }
    return this;
  }

  setTraceId(traceId: string): this {
    this.response.traceId = traceId;
    return this;
  }

  setStack(stack: string[]): this {
    this.response.stack = stack;
    return this;
  }

  build(): ErrorResponse {
    return this.response as ErrorResponse;
  }
}

export function isErrorResponse(obj: any): obj is ErrorResponse {
  return (
    obj &&
    typeof obj === 'object' &&
    obj.success === false &&
    obj.error &&
    typeof obj.error.message === 'string' &&
    typeof obj.error.statusCode === 'number'
  );
}

export function isSuccessResponse<T = any>(obj: any): obj is SuccessResponse<T> {
  return obj && typeof obj === 'object' && obj.success === true && 'data' in obj;
}
