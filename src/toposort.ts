import { tryResolveRef } from './deconstruction';

/**
 * Returns the resources sorted in reverse topological order: given two
 * resources A and B, if A has a reference to B, then B will appear before A
 * in the result.
 */
export function topologicalSort(resources: any): [string, any][] {
  const stack: string[] = [];
  const sorted: string[] = [];
  Object.keys(resources).forEach(visit);
  return sorted.map((id: string) => [id, resources[id]]);

  // recursive function to visit the graph formed by the resources,
  // in a depth-first way.
  // If resource A has a reference to resource B, then A will be visited
  // before B.
  function visit(id: string) {
    // Since we're going depth-first, the stack corresponds to a path in the graph;
    // So if any node appears again, it is a back edge, which creates a cycle.
    if (stack.includes(id)) {
      const path = stack.concat(id).slice(stack.indexOf(id)).join(' -> ');
      throw new Error(`Cycle detected: ${path}`);
    }

    // No cycles. Proceed with the DFS
    if (!hasBeenVisited(id)) {
      stack.push(id);
      adjacent(id).forEach(visit);
      stack.pop();
      sorted.push(id);
    }
  }

  function hasBeenVisited(id: string): boolean {
    return sorted.includes(id);
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
