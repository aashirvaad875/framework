import type { ExecutionContext } from '../context/execution-context.js';
import type { Interceptor } from '../interceptors/interceptor.interface.js';
import type { PipeTransform } from '../../decorators/index.js';
import { ForbiddenException } from '../../exceptions/index.js';
import { ParameterResolver } from './parameter-resolver.js';

export type GuardFn = (req: any, res: any, next: any) => boolean | Promise<boolean>;

export class ExecutionPipeline {
  constructor(
    private guards: GuardFn[],
    private beforeInterceptors: Interceptor[],
    private pipes: PipeTransform[],
    private afterInterceptors: Interceptor[],
  ) {}

  async execute(
    context: ExecutionContext,
    handler: Function,
    instance: unknown,
    args: any[],
  ): Promise<any> {
    const req = context.getRequest();
    const res = context.getResponse();

    // 1. Execute guards
    for (const guard of this.guards) {
      const result = await guard(req, res, () => undefined);
      if (result === false) {
        throw new ForbiddenException('Access denied');
      }
    }

    // 2. Execute before interceptors
    let finalContext = context;
    for (const interceptor of this.beforeInterceptors) {
      finalContext = await interceptor.intercept(finalContext, async () => context);
    }

    // 3. Transform parameters through pipes
    const transformedArgs: any[] = [];
    for (let i = 0; i < args.length; i++) {
      let transformedValue = args[i];
      for (const pipe of this.pipes) {
        transformedValue = await pipe.transform(transformedValue, { type: 'param', metatype: undefined });
      }
      transformedArgs[i] = transformedValue;
    }

    // 4. Execute handler
    const result = await handler.apply(instance, transformedArgs);

    // 5. Execute after interceptors
    let finalResult = result;
    for (const interceptor of this.afterInterceptors) {
      finalResult = await interceptor.intercept(context, async () => result);
    }

    return finalResult;
  }
}
