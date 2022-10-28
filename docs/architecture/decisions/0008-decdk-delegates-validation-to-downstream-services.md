# 8. DeCDK delegates validation to downstream services

Date: 2022-10-28

## Status

Accepted

## Context

Declarative CDK is designed as a drop-in app for the AWS CDK and used to deploy AWS CloudFormation templates. It cannot exists outside of this context.
The AWS CDK focus on shifting left to improve the developer experience.
AWS CloudFormation has delivered operational excellence over more than a decade.
In other words, both the AWS CDK & AWS CloudFormation are already extremely good at validating user input.

Declarative CDK must do necessary validation to evaluate templates as a AWS CDK apps.
In some situation the user intention will not be clear from context. Attempting to "guess" user intention is not acceptable. In those situations we need a mechanisms to enforce the declaration of user intention.

## Decision

Declarative CDK will only validate input as needed.

If intention cannot be unambiguously inferred, input validation is an appropriate way to force user intention.

Additional validations should be handled by downstream services, particularly the AWS CDK and AWS CloudFormation.

## Consequences

Declarative CDK should stay "out of the way" as much as possible.

The developer experience will not be ideal, if a template has to be first deployed with CloudFormation, before it can return an error.
We have to apply different strategies to circumvent this problem:

- **Improve the authoring experience**\
  Support for code-completion and validation in IDEs will enable users to author valid templates in the first place.
  Dedicated validation tools enable integration with automated environments.
- **Shift left with the AWS CDK**\
  The AWS CDK already has established patterns of validating user input when synthesizing a template. We can add missing validations to the AWS CDK when necessary.
- **Extending AWS CloudFormation**\
  APIs and tools integrating with AWS CloudFormation already perform certain validations. We can work towards adding additional validations to these APIs and tools when necessary.
