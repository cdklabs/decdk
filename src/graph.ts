import { mapValues } from './deconstruction';

export interface Edge<L> {
  label: L;
  target: string;
}

/**
 * A directed acyclic graph with labelled edges
 */
export class DirectedAcyclicGraph<V, L> {
  private readonly sortedIds: string[];
  constructor(
    private readonly vertices: Record<string, V>,
    private readonly edges: Record<string, Edge<L>[]>
  ) {
    if (!sameElements(Object.keys(vertices), Object.keys(edges))) {
      throw new Error('Vertices and edges must have the same keys');
    }
    this.sortedIds = topologicalSort(
      this.vertices,
      mapValues(edges, (es) => es.map((e) => e.target))
    );
  }

  /**
   * Produces a new graph with the same structure, but with the content of the
   * vertices mapped using the provided function.
   */
  public map<W>(fn: (vertex: V) => W): DirectedAcyclicGraph<W, L> {
    const mappedVertices = Object.fromEntries(
      this.sortedIds.map((id) => [id, fn(this.vertices[id])])
    );
    return new DirectedAcyclicGraph<W, L>(mappedVertices, this.edges);
  }

  /**
   * Produces a new graph with the same structure, but with the content of the
   * vertices mapped using the provided function. The dependencies of the
   * vertex are taken into account.
   *
   * @param fn A function that, given an element and its dependencies, returns a
   * new element.
   */
  public mapWithAdjacent<W>(
    fn: (a: V, deps: V[]) => W
  ): DirectedAcyclicGraph<W, L> {
    const vertices = this.vertices;
    const edges = this.edges;
    const mappedVertices = Object.fromEntries(
      this.sortedIds.map(transformEntry)
    );
    return new DirectedAcyclicGraph<W, L>(mappedVertices, this.edges);

    function transformEntry(id: string): [string, W] {
      const vertex = vertices[id];
      const adjacent = edges[id].map((edge) => vertices[edge.target]);
      return [id, fn(vertex, adjacent)];
    }
  }

  public mapWithEdges<W>(
    fn: (vertex: V, out: Edge<L>[]) => W
  ): DirectedAcyclicGraph<W, L> {
    const vertices = this.vertices;
    const edges = this.edges;
    const mappedVertices = Object.fromEntries(
      this.sortedIds.map(transformEntry)
    );
    return new DirectedAcyclicGraph<W, L>(mappedVertices, this.edges);

    function transformEntry(id: string): [string, W] {
      const vertex = vertices[id];
      return [id, fn(vertex, edges[id])];
    }
  }

  /**
   * List of vertices sorted in reverse topological order: given two resources
   * A and B, if A has a reference to B, then B will appear before A in the
   * result.
   */
  public get sortedVertices(): V[] {
    return this.sortedIds.map((id) => this.vertices[id]);
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