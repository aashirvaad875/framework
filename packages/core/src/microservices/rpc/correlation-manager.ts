export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason?: Error) => void;
  timeout: NodeJS.Timeout;
}

export class CorrelationManager {
  private pending: Map<string, PendingRequest> = new Map();

  registerRequest(messageId: string, timeoutMs: number = 5000): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(messageId);
        reject(new Error(`Request ${messageId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pending.set(messageId, { resolve, reject, timeout });
    });
  }

  resolveRequest(messageId: string, response: unknown): void {
    const pending = this.pending.get(messageId);
    if (!pending) {
      console.warn(`No pending request for ${messageId}`);
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(messageId);
    pending.resolve(response);
  }

  rejectRequest(messageId: string, error: Error): void {
    const pending = this.pending.get(messageId);
    if (!pending) {
      console.warn(`No pending request for ${messageId}`);
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(messageId);
    pending.reject(error);
  }

  clear(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
    }
    this.pending.clear();
  }

  getPendingCount(): number {
    return this.pending.size;
  }
}
