/**
 * Returns the resources sorted in reverse topological order: given two resources A and B, if A
 * has a reference to B, then B will appear before A in the result.
 */
import { DeclarativeResource } from './deconstruction';

export function topologicalSort(resources: {
  [id: string]: DeclarativeResource;
}): [string, any][] {
  const stack: string[] = [];
  const sorted: string[] = [];
  const visited: Set<string> = new Set();
  Object.keys(resources).forEach(visit);
  return sorted.map((id: string) => [id, resources[id]]);

  /**
   * Recursive function to visit, in a depth-first way, the graph formed by the resources, starting
   * from a given node.
   *
   * If resource A has a transitive reference to resource B, then A will be visited after B. When a
   * resource is visited for the first time, it is appended to the result. Therefore, the id of A
   * will appear after the id of B in the final result.
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
    // So if any node appears twice in the stack, it means we have a back edge and, therefore, a cycle.
    if (stack.includes(id)) {
      const path = stack.concat(id).slice(stack.indexOf(id)).join(' -> ');
      throw new Error(`Cycle detected: ${path}`);
    }
  }

  /**
   * Returns the list of ids referenced from anywhere in the resource definition.
   *
   * @param resourceId the logical id of the resource being queried.
   */
  function adjacent(resourceId: string): string[] {
    const resource = resources[resourceId];

    const dependsOn = resource?.DependsOn;
    if (dependsOn != null) {
      const dependencyIds = Array.isArray(dependsOn) ? dependsOn : [dependsOn];
      return dependencyIds.filter((id) => id in resources);
    }

    return [...new Set(process(resource))];

    function process(value: any): string[] {
      if (typeof value === 'object' && Object.keys(value ?? {}).length === 1) {
        if ('Fn::GetAtt' in value) {
          const [target, _] = value['Fn::GetAtt'];
          if (target in resources) {
            return [target];
          }
        } else if ('Ref' in value) {
          if (value.Ref in resources) {
            return [value.Ref];
          }
        }
      }

      if (Array.isArray(value)) {
        return value.flatMap(process);
      }

      if (typeof value === 'object') {
        return Object.values(value).flatMap(process);
      }

      return [];
    }
  }
}
