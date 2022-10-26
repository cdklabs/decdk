import { AnnotationsContext } from './annotations';

export class DeclarativeStackError extends Error {
  constructor(public readonly annotations: AnnotationsContext) {
    super();
    this.name = 'Declarative CDK Errors';
    Object.setPrototypeOf(this, DeclarativeStackError.prototype);
  }

  public toString(debug = false) {
    return `${this.name}:\n\n${this.annotations.toString(debug)}`;
  }
}

/**
 * Thrown by the Evaluator
 */
export class RuntimeError extends Error {
  public static wrap(error: any) {
    return new RuntimeError(error.message, error.stack);
  }

  constructor(message: string, stack?: string) {
    super(message);
    this.name = 'RuntimeError';
    if (stack) {
      this.stack = stack;
    }
    Object.setPrototypeOf(this, RuntimeError.prototype);
  }
}

/**
 * Annotation any Error with additional info
 */
export class AnnotatedError {
  constructor(public readonly stack: string[], public readonly error: Error) {}

  public toString(printStackStrace = false) {
    return `[${this.error.name} at ${this.renderStack()}]\n    ${
      printStackStrace ? this.error.stack : this.error.message
    }`;
  }

  protected renderStack() {
    return this.stack.map((s) => (s.includes('.') ? `"${s}"` : s)).join('.');
  }
}
