import { AnnotatedError } from './errors';

export class AnnotationsContext {
  public static root(): AnnotationsContext {
    return new AnnotationsContext();
  }

  public readonly children = new Array<AnnotationsContext>();
  public readonly path: string;
  public readonly parent?: AnnotationsContext;
  private readonly _errorsStack: AnnotatedError[] = [];

  private constructor(parent?: AnnotationsContext, path?: string) {
    this.path = path || '';
    if (parent) {
      this.path = parent.path ? parent.path + '.' + this.path : this.path;
      this.parent = parent;
      parent.children.push(this);
    }
  }

  public get root(): boolean {
    return !!this.parent;
  }

  public hasErrors(): boolean {
    return this.errors.length > 0;
  }

  public get errors(): AnnotatedError[] {
    return [...this._errorsStack, ...this.children.flatMap((c) => c.errors)];
  }

  public child(path: string): AnnotationsContext {
    return new AnnotationsContext(this, path);
  }

  public wrap<T>(fn: (ctx: AnnotationsContext) => T): T | void {
    try {
      return fn(this);
    } catch (error) {
      this.error(error as any);
    }
  }

  public error(error: Error) {
    this._errorsStack.push(new AnnotatedError(this.path, error));
  }

  public printErrors(logger: Console['log']) {
    logger(this.toString());
  }

  public toString(printStackStrace = false) {
    return this.errors.map((e) => e.toString(printStackStrace)).join('\n');
  }
}
