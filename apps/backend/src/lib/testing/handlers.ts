type Handler = (...args: never[]) => unknown;

/**
 * A controller method as the handler a guard or interceptor reads metadata
 * from. Read off the prototype, never called, so `this` is not involved.
 */
export const handlerOf = <T extends object>(
  controller: { prototype: T },
  name: keyof T,
): Handler => Reflect.get(controller.prototype, name) as Handler;
