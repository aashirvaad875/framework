import { CONTROLLER_METADATA_KEY } from '../../decorators/index.js';
import { di } from '../../container.js';

export class ControllerFactory {
  static create(controllerClass: Function): unknown {
    return di.resolve(controllerClass as new (...args: any[]) => any);
  }

  static isController(target: Function): boolean {
    return Boolean(Reflect.getMetadata(CONTROLLER_METADATA_KEY, target));
  }
}
