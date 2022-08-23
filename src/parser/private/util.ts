export function mkDict<A>(
  xs: ReadonlyArray<readonly [string, A]>
): Record<string, A> {
  const ret: Record<string, A> = {};
  for (const [k, v] of xs) {
    ret[k] = v;
  }
  return ret;
}
