import type { Request, Response } from 'express';
import type { ExecutionContext } from '../context/execution-context.js';
import type { PipeTransform } from '../../decorators/index.js';

export interface ParameterMetadata {
  source: 'body' | 'param' | 'query' | 'req' | 'res' | 'header' | 'context';
  name?: string;
}

export class ParameterResolver {
  static resolve(
    req: Request,
    res: Response,
    context: ExecutionContext,
    handlerFn: Function,
    controllerClass: Function,
  ): unknown[] {
    const paramMetadata = (Reflect as any).getOwnMetadata?.('params', controllerClass.prototype, handlerFn.name) ?? {};
    const paramCount = handlerFn.length;
    const args: any[] = [];

    for (let i = 0; i < paramCount; i++) {
      const paramInfo = paramMetadata[i];
      if (!paramInfo) {
        continue;
      }

      args[i] = this.extractParameter(paramInfo, req, res, context);
    }

    return args;
  }

  private static extractParameter(
    paramInfo: ParameterMetadata,
    req: Request,
    res: Response,
    context: ExecutionContext,
  ): unknown {
    switch (paramInfo.source) {
      case 'body':
        return req.body;
      case 'param':
        return paramInfo.name ? req.params[paramInfo.name] : undefined;
      case 'query':
        return paramInfo.name ? req.query[paramInfo.name] : undefined;
      case 'header':
        return paramInfo.name ? req.get(paramInfo.name) : undefined;
      case 'req':
        return req;
      case 'res':
        return res;
      case 'context':
        return context;
      default:
        return undefined;
    }
  }

  static async transformParameter(value: unknown, pipes: PipeTransform[]): Promise<unknown> {
    let transformed = value;
    for (const pipe of pipes) {
      transformed = await pipe.transform(transformed, { type: 'body', metatype: undefined });
    }
    return transformed;
  }
}
