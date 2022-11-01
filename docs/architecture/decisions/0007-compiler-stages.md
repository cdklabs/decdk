# 7. Compiler Stages

Date: 2022-10-28

## Status

Accepted

## Context

The original implementation of this package [^1] as well as other prior art like `cdk-dasm` [^2] or `cloudformation-include` [^3] do not implement a strict separation between the various steps needed to evaluate CloudFormation-like templates (for good reasons).

We have [previously defined the middle layer](./0002-parse-typed-ast-before-evaluation.md) for the compiler.
However we missed to formally define the other stages, as well as types for input, output and errors.
This caused uncertainty about the separation of concerns between the stages.

We also believe that the developed compiler could be used for other purposes then Declarative CDK. A stricter, well-defined design should help to manifest this approach.

## Decision

All compilation steps must be handled within one of the defined stages.\
All stages must only operate on a their dedicated types, no exceptions.\
All stages should only throw their respective error types.

The compiler stages are:

### Grammar parser

Parses raw text into template expressions.
Validates JSON or Yaml syntax and CloudFormation syntax.

|            | Types                           |
| ---------- | ------------------------------- |
| **Input**  | Raw text                        |
| **Output** | `TemplateExpression`            |
| **Errors** | `SyntaxError`, `YAMLParseError` |

### Type resolution

Resolves template expressions to their expected types based on the provided jsii type system.
Validates that provided values are matching the expected types.

|            | Types                     |
| ---------- | ------------------------- |
| **Input**  | `TemplateExpression`      |
| **Output** | `TypedTemplateExpression` |
| **Errors** | `TypeError`               |

### Evaluation

Evaluates typed template expressions into an evaluation target. For Declarative CDK the target is an AWS CDK app. Evaluation may include validations that are difficult to apply earlier.

|            | Types                       |
| ---------- | --------------------------- |
| **Input**  | `TypedTemplateExpression`   |
| **Output** | `any`                       |
| **Errors** | `RuntimeError`, `TypeError` |

## Consequences

All features must be handled within one of the defined stages.

For some simple features, this might cause additional overhead of passing values through all stages virtually unchanged.
However this ensures the general purposefulness of the compiler, particularly in scenarios other than Declarative CDK.

Therefore features should not be implemented in the `DeclarativeStack` directly.
Rather it serves as a container to connect all compiler stages together.

[^1]: https://github.com/cdklabs/decdk/releases/tag/v2.0.0-pre.5
[^2]: https://github.com/aws/aws-cdk/tree/main/packages/cdk-dasm
[^3]: https://github.com/aws/aws-cdk/tree/main/packages/%40aws-cdk/cloudformation-include