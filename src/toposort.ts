import { tryResolveRef } from './deconstruction';

/**
 * Returns the resources sorted in reverse topological order: given two
 * resources A and B, if A has a reference to B, then B will appear before A
 * in the result.
 */
export function topologicalSort(resources: any): [string, any][] {
  const stack: string[] = [];
  const sorted: string[] = [];
  Object.keys(resources).forEach(recurse);
  return sorted.map((id: string) => [id, resources[id]]);

  function recurse(id: string) {
    if (stack.includes(id)) {
      const path = stack.concat(id).slice(stack.indexOf(id)).join(' -> ');
      throw new Error(`Cycle detected: ${path}`);
    }
    if (!sorted.includes(id)) {
      stack.push(id);
      adjacent(id).forEach(recurse);
      stack.pop();
      sorted.push(id);
    }
  }

  function adjacent(resourceId: string): string[] {
    const resource = resources[resourceId];
    const refs: Set<string> = new Set();
    process(resource);
    return Array.from(refs);

    function process(obj: any) {
      if (Array.isArray(obj)) {
        obj.forEach(process);
      }

      if (obj != null && typeof obj == 'object') {
        const id = tryResolveRef(obj);
        if (id != null && resources[id] != null) {
          refs.add(id);
          return;
        }
        Object.values(obj).forEach(process);
      }
    }
  }
}
