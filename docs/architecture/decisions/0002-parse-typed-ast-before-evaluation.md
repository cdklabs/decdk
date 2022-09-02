# 2. Parse Typed AST before evaluation

Date: 2022-09-02

## Status

Accepted

## Context

DeCDK templates are a superset of CloudFormation templates. They are written in
JSON or YAML format. Syntax rules that apply for CFN templates also apply for
deCDK templates. In addition to this, deCDK templates are strongly typed.

Primitive types are natively supported in JSON/YAML. Complex types will be
represented as object structures, and their type will be inferred from context.
We call this step "type resolution".

To maintain abstractions, the idea was proposed to first parse templates into an
intermediate format that is easier to assert on. This format would then serve as
the basis for any evaluation steps.

## Decision

We will parse deCDK templates into a Typed Abstract Syntax Tree ("the AST")
before we evaluate them.

We will only evaluate the AST, never templates directly.

The AST will be serializable.

## Consequences

The AST gives us guarantees about the correctness of syntax and types.
Evaluation steps won't have to concern themselves with asserting syntax and
types.

All features will have to be represented in the AST before being evaluated. For
some future features, this representation in the AST might not be obvious.

All steps of the process can be tested independently of each other. The
serializable nature of the AST enabled human inspection and creation of test
cases.
