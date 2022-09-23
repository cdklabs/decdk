export function splitPath(s: string): [string[], string] {
  const elements = s.split('.');
  return [elements.slice(0, -1), elements[elements.length - 1]];
}
