# 4. Use only Fully Qualified Names

Date: 2022-09-09

## Status

Accepted

## Context

DeCDK templates refer to CDK types when defining Resources. In CDK apps types
are namespaced by module and import maps allow for short, readable references.

Unqualified shorter forms may change meaning if the underlying CDK library is
changed in valid ways.


```yaml
Properties:
    code:   # aws-cdk-lib.aws_lambda.Code
        fromAsset: '/tmp'
```

The syntax above can only work because the `code` property is typed as a `Code`
class which has static factory functions. If the type is changed to either
abstract class `BaseCode` or interface `ICode`, we would lose the ability to
know that the factory functions exist on the Code class. Changing property types
to supertypes — a.k.a. weakening preconditions — is a valid type evolution in
jsii.

```yaml
timeout:    # aws-cdk-lib.Duration
    Duration.seconds: 5
```

The syntax above requires that `Duration` resolves to `aws-cdk-lib.Duration`. If
`aws-cdk-lib.aws_lambda.Duration` ever comes into existence, it would take
precedence, thus changing the meaning of `Duration.seconds`.

## Decision

We only allow Fully Qualified Names when referring to types.

## Consequences

Type resolution is unambiguous.

Users have to use FQNs when authoring deCDK templates.

We can still add syntactic sugars for cases where a shorter name is clearly
defined by its context.

We can still add support for import maps or resolutions rules.
