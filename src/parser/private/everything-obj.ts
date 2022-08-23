export function proxiedGetter(handler: (propName: string) => string) {
  return new Proxy(
    {},
    {
      get(_target, name, _receiver) {
        return handler(String(name));
      },
    }
  );
}
