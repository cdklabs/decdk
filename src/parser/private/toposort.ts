export class DependencyGraph<A> {
  public readonly keys = new Set(Object.keys(this.nodes));

  constructor(
    private readonly nodes: Record<string, A>,
    private readonly _dependencies: Map<string, Set<string>>
  ) {
    // Restrict dependencies to only keys in nodes
    for (const [name, deps] of this._dependencies.entries()) {
      if (name in nodes) {
        this._dependencies.set(name, intersect(deps, this.keys));
      }
    }
  }

  /**
   * Return a single node in the graph
   */
  public get(key: string): A {
    const ret = this.nodes[key];
    if (ret === undefined) {
      throw new Error(`No such key: ${key}`);
    }
    return ret;
  }

  /**
   * Return a copy of the graph, restricted to only the nodes in the list
   */
  public restrict(keys: string[]) {
    const nodes = Object.fromEntries(
      Object.entries(this.nodes).filter(([k, _]) => keys.includes(k))
    );
    return new DependencyGraph(nodes, this.copyDependencies());
  }

  /**
   * The node is that are direct dependencies of the given node
   */
  public directDependencies(key: string): string[] {
    return Array.from(this.dependencies.get(key) ?? []);
  }

  /**
   * The node is that are direct dependents on the given node
   */
  public directDependents(key: string): string[] {
    return Array.from(this.dependencies.entries())
      .filter(([_, xs]) => xs.has(key))
      .map(([k, _]) => k);
  }

  /**
   * All nodes that are dependencies of this node, and this node itself
   */
  public upstream(key: string) {
    this.closure(key, (k) => this.directDependencies(k));
  }

  /**
   * All nodes that are dependents of this node, and this node itself
   */
  public downstream(key: string) {
    return this.closure(key, (k) => this.directDependents(k));
  }

  /**
   * Turn the graph into a queue that can be consumed in dependency order
   */
  public topoQueue(): TopoQueue<A> {
    return new TopoQueue(this);
  }

  /**
   * Whether the given node has dependencies
   */
  public hasDependencies(key: string) {
    return !!this._dependencies.get(key)?.size;
  }

  /**
   * Remove a node from the graph
   */
  public removeNode(key: string) {
    delete this.nodes[key];
    this._dependencies.delete(key);
    for (const sets of this._dependencies.values()) {
      sets.delete(key);
    }
  }

  /**
   * Merge two graphs, return a new graph
   */
  public merge<B>(other: DependencyGraph<B>): DependencyGraph<A | B> {
    const nodes = { ...this.nodes, ...other.nodes };
    const deps = this.copyDependencies();
    for (const [k, xs] of other.copyDependencies().entries()) {
      deps.set(
        k,
        new Set(Array.from(deps.get(k) ?? []).concat(Array.from(xs)))
      );
    }
    return new DependencyGraph(nodes, deps);
  }

  /**
   * Return a copy of the graph
   */
  public copy() {
    return new DependencyGraph({ ...this.nodes }, this.copyDependencies());
  }

  /**
   * Access the dependency map
   */
  public get dependencies(): ReadonlyMap<string, ReadonlySet<string>> {
    return this._dependencies;
  }

  private copyDependencies() {
    return new Map(
      Array.from(this._dependencies.entries()).map(
        ([k, v]) => [k, new Set(v)] as const
      )
    );
  }

  private closure(startingKey: string, mapping: (key: string) => string[]) {
    const found = new Set<string>();
    const queue = [startingKey];
    while (queue.length > 0) {
      const next = queue.shift()!;
      if (found.has(next)) {
        continue;
      }

      found.add(next);
      queue.push(...mapping(next));
    }
    return this.restrict(Array.from(found));
  }
}

/**
 * A queue that will deliver its values in topologically sorted order
 */
export class TopoQueue<A> {
  private readonly blocked: Set<string>;
  private readonly available = new Array<string>();
  private readonly originalGraph: DependencyGraph<A>;
  private readonly currentGraph: DependencyGraph<A>;

  constructor(graph: DependencyGraph<A>) {
    this.originalGraph = graph;
    this.currentGraph = graph.copy();
    this.blocked = new Set(graph.keys);
    this.determineAvailable();
  }

  public isEmpty() {
    return this.blocked.size + this.available.length === 0;
  }

  public take(): QueueElement<A> {
    const identifier = this.available.shift();
    if (!identifier) {
      throw new Error("Cannot 'take', queue is empty");
    }

    return {
      identifier,
      element: this.originalGraph.get(identifier),
      remove: () => {
        this.advance(identifier);
      },
    };
  }

  public withNext<B>(block: (identifier: string, element: A) => B): B {
    const one = this.take();
    const ret = block(one.identifier, one.element);
    one.remove();
    return ret;
  }

  public peek(): PeekElements<A> {
    const elements = this.available.map(
      (key) => [key, this.originalGraph.get(key)] as const
    );
    return {
      elements,
      skip: () => {
        this.available.splice(0, this.available.length);
        for (const el of elements) {
          this.advance(el[0]);
        }
      },
    };
  }

  private advance(key: string) {
    this.currentGraph.removeNode(key);
    this.determineAvailable();
  }

  private determineAvailable() {
    const avail = Array.from(this.blocked).filter(
      (key) => !this.currentGraph.hasDependencies(key)
    );

    for (const x of avail) {
      this.blocked.delete(x);
    }
    this.available.push(...avail);

    if (this.blocked.size > 0 && this.available.length === 0) {
      const cycle = findCycle(this.currentGraph.dependencies);
      throw new Error(`Dependency cycle in graph: ${cycle.join(' => ')}`);
    }
  }
}

export interface QueueElement<A> {
  readonly identifier: string;
  readonly element: A;

  remove(): void;
}

export interface PeekElements<A> {
  readonly elements: Array<readonly [string, A]>;

  skip(): void;
}

/**
 * Find cycles in a graph
 *
 * Not the fastest, but effective and should be rare
 */
function findCycle(deps: ReadonlyMap<string, ReadonlySet<string>>): string[] {
  for (const node of deps.keys()) {
    const cycle = recurse(node, [node]);
    if (cycle) {
      return cycle;
    }
  }
  throw new Error('No cycle found. Assertion failure!');

  function recurse(node: string, path: string[]): string[] | undefined {
    for (const dep of deps.get(node) ?? []) {
      if (dep === path[0]) {
        return [...path, dep];
      }

      const cycle = recurse(dep, [...path, dep]);
      if (cycle) {
        return cycle;
      }
    }

    return undefined;
  }
}

function intersect<A>(xs: Set<A>, ys: Set<A>) {
  return new Set(Array.from(xs).filter((x) => ys.has(x)));
}
