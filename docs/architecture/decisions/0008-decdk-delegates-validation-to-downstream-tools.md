# 8. DeCDK delegates validation to downstream tools

Date: 2022-10-28

## Status

Accepted

## Context

- CDK & CloudFormation are already good at validating input
- DeCDK needs to do some validation so it can compile templates to CDK apps
- This does not mean that deCDK will "guess" user intention. Where intention is
  unclear, validation is still approporiate
- Any other validations should be delegated to CDK & CloudFormation respectively
- If we want to shift further left, additional validation should be added to CDK
  directly

## Decision

The change that we're proposing or have agreed to implement.

## Consequences

What becomes easier or more difficult to do and any risks introduced by the change that will need to be mitigated.
