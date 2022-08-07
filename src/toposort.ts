import { tryResolveRef } from './deconstruction';

/**
 * Returns the resources sorted in reverse topological order: given two
 * resources A and B, if A has a reference to B, then B will appear before A
 * in the result.
 */
export function topologicalSort(resources: any): [string, any][] {
  const stack: string[] = [];
  const sorted: string[] = [];
  const visited: Set<string> = new Set();
  Object.keys(resources).forEach(visit);
  return sorted.map((id: string) => [id, resources[id]]);

  /**
   * Recursive function to visit, in a depth-first way, the graph
   * formed by the resources, starting from a given node.
   *
   * If resource A has a transitive reference to resource B, then A
   * will be visited after B. When a resource is visited for the
   * first time, it is appended to the result. Therefore, the id of
   * A will appear after the id of B in the final result.
   *
   * @param id the id of the starting point of the visit
   */
  function visit(id: string) {
    assertNoCycle(id);

    // No cycle detected. Proceed with the DFS
    if (!visited.has(id)) {
      stack.push(id);
      adjacent(id).forEach(visit);
      stack.pop();
      sorted.push(id);
      visited.add(id);
    }
  }

  function assertNoCycle(id: string) {
    // Since we're going depth-first, the stack corresponds to a path in the graph.
    // So if any node appears twice in the stack, it means we have a back edge and,
    // therefore, a cycle.
    if (stack.includes(id)) {
      const path = stack.concat(id).slice(stack.indexOf(id)).join(' -> ');
      throw new Error(`Cycle detected: ${path}`);
    }
  }

  /**
   * Returns the list of ids referenced from anywhere in the resource
   * definition.
   *
   * @param resourceId the logical id of the resource being queried.
   */
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
