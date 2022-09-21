# 5. Custom intrinsic to get values from Constructs

Date: 2022-09-12

## Status

Accepted

## Context

In CloudFormation the `Fn::GetAtt` intrinsic function returns the value of
Resource Attributes. It can be used to reference these values in other
Resources. With deCDK users might now also want to reference the Properties of
their Constructs.

We could overload the `Fn::GetAtt` intrinsic to also return Property values.
However this might be confusing. `CfnAtt` does not exist on the Construct (it's
a CFN attribute). What should `{ 'Fn::GetAtt': ['CdkConstruct', 'CfnAtt'] }`
then return?

- `CdkConstruct.CfnAtt` or
- `CdkConstruct.defaultChild.CfnAtt`?

Here an answer could be to attempt both. However in some situations
CloudFormation attributes and Construct props are sharing the same name. For
`Name` and `name` the difference is only the case of the first letter. Should we
still attempt to return both?

The alternative is to make it explicit what the target of the intrinsic function
is. `Fn::GetAtt` can always refer to a CloudFormation Resource Attributes and a
new intrinsic `CDK:GetProp` can always refer to Construct Properties

## Decision

We introduce a new custom intrinsic function `CDK:GetProp` to return values from
CDK constructs.

`CDK:GetProp` cannot be used with a CFN Resource as target. We will throw an
error in this case.

`Fn::GetAtt` will always return a CFN Resource Attribute. For Constructs, we
will return Attributes of the default child or throw an error.

## Consequences

Users will make a conscious decision whether they want to reference a
Construct Property or a Resource Attribute.

We have to support parsing custom intrinsic functions.
