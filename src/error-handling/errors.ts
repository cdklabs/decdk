import { AnnotationsContext } from './annotations';

function indent(text: string, spaces = 4) {
  const TAB = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((l) => TAB + l)
    .join('\n');
}

export class DeclarativeStackError extends Error {
  constructor(public readonly annotations: AnnotationsContext) {
    super();
    this.name = 'DeclarativeStackError';
    this.message = this.toString();
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
    const details = this.renderErrorDetails(printStackStrace);
    return `[${this.error.name} at ${this.renderStack()}]\n${indent(details)}`;
  }

  protected renderErrorDetails(printStackStrace = false): string {
    if (printStackStrace) {
      return this.error.stack ?? this.error.message;
    }
    return this.error.message;
  }

  protected renderStack(): string {
    return this.stack.map((s) => (s.includes('.') ? `"${s}"` : s)).join('.');
  }
}
