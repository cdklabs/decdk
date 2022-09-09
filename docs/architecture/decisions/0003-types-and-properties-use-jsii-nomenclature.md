# 3. Types and Properties use jsii nomenclature

Date: 2022-09-09

## Status

Accepted

## Context

CloudFormation tends to name things with uppercase characters and `::` as
separators. E.g. `AWS::IAM::Role` or `Fn::GetAtt`. AWS CDK is written in
TypeScript and uses lowercase for module names, mixed cases for classes and
methods, and `.` as separators. These types are exposed to other languages via
the jsii assembly.

It is difficult to define a general bijection mapping for these types. For
example `FROM_ASSET` is ambiguous and could mapped to `FromAsset`, `fromAsset`
even `from_asset`. All three results are legal code in TypeScript.

## Decision

We use the nomenclature provided by the jsii assembly.

## Consequences

We do not have to convert between different nomenclature styles.

Users have to adapt their mental model when writing deCDK templates, compared to
plain CloudFormation templates.
