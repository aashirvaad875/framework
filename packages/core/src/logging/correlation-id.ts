const CORRELATION_ID_HEADER = 'x-correlation-id';
const TRACE_ID_HEADER = 'x-trace-id';

export class CorrelationIdGenerator {
  static generate(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}-${process.pid}`;
  }

  static isValid(id: string): boolean {
    return /^\d+-[a-z0-9]+-\d+$/.test(id);
  }

  static extractFromHeaders(headers: Record<string, any>): {
    correlationId: string;
    traceId: string;
  } {
    const correlationId =
      (headers[CORRELATION_ID_HEADER] as string) || this.generate();
    const traceId = (headers[TRACE_ID_HEADER] as string) || this.generate();

    return { correlationId, traceId };
  }

  static getHeaderName(type: 'correlation' | 'trace'): string {
    return type === 'correlation' ? CORRELATION_ID_HEADER : TRACE_ID_HEADER;
  }
}

export function formatCorrelationId(correlationId: string): string {
  return `[${correlationId.substring(0, 12)}...]`;
}
