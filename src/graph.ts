import { mapValues } from './deconstruction';

export interface Edge<E> {
  label: E;
  target: string;
}

/**
 * A directed acyclic graph with labelled edges
 */
export class DirectedAcyclicGraph<V, E> {
  private _sortedIds: string[] = [];
  constructor(
    private readonly vertices: Record<string, V>,
    private readonly edges: Record<string, Edge<E>[]>
  ) {
    if (!sameElements(Object.keys(vertices), Object.keys(edges))) {
      throw new Error('Vertices and edges must have the same keys');
    }
  }

  /**
   * Produces a new graph with the same structure, but with the content of the
   * vertices mapped using the provided function.
   */
  public mapVertices<W>(fn: (vertex: V) => W): DirectedAcyclicGraph<W, E> {
    const mappedVertices = Object.fromEntries(
      this.sortedIds.map((id) => [id, fn(this.vertices[id])])
    );
    const graph = new DirectedAcyclicGraph<W, E>(mappedVertices, this.edges);
    // We're not changing any edge, so the order is preserved
    graph._sortedIds = this._sortedIds;
    return graph;
  }

  /**
   * Calls a function with side effects for each edge in the graph.
   */
  public forEachEdge(fn: (from: V, to: V, label: E) => void) {
    Object.entries(this.edges).forEach(([fromId, edges]) => {
      edges.forEach((edge) => {
        const source = this.vertices[fromId];
        const target = this.vertices[edge.target];
        const label = edge.label;
        fn(source, target, label);
      });
    });
  }

  /**
   * List of vertices sorted in reverse topological order: given two resources
   * A and B, if A has a reference to B, then B will appear before A in the
   * result.
   */
  public get sortedVertices(): V[] {
    return this.sortedIds.map((id) => this.vertices[id]);
  }

  private get sortedIds(): string[] {
    if (this._sortedIds.length === 0) {
      this._sortedIds = topologicalSort(
        this.vertices,
        mapValues(this.edges, (es) => es.map((e) => e.target))
      );
    }
    return this._sortedIds;
  }
}

function topologicalSort<V>(
  vertices: Record<string, V>,
  edges: Record<string, string[]>
): string[] {
  const stack: string[] = [];
  const sorted: string[] = [];
  const visited: Set<string> = new Set();
  Object.keys(vertices).forEach(visit);
  return sorted;

  /**
   * Recursive function that visits the graph in depth-first order, starting
   * from a given node.
   *
   * If vertex A has a path to resource B, then A will be visited after B.
   * When a vertex is visited for the first time, it is appended to the
   * result.
   *
   * @param id the starting point of the visit
   */
  function visit(id: string) {
    assertNoCycle(id);

    // No cycle detected. Proceed with the DFS
    if (!visited.has(id)) {
      stack.push(id);
      edges[id].forEach(visit);
      stack.pop();
      sorted.push(id);
      visited.add(id);
    }
  }

  function assertNoCycle(id: string) {
    // Since we're going depth-first, at any point in the execution, the stack
    // corresponds to a path in the graph. So if any vertex appears twice in
    // the stack, it means we have a back edge and, therefore, a cycle.
    if (stack.includes(id)) {
      const path = stack.concat(id).slice(stack.indexOf(id)).join(' -> ');
      throw new Error(`Cycle detected: ${path}`);
    }
  }
}

function sameElements<A>(a1: A[], a2: A[]) {
  const s2 = new Set(a2);
  return a1.length === s2.size
    ? a1.every((element: A) => s2.has(element))
    : false;
}
