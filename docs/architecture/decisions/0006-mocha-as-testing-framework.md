# 6. Mocha as Testing Framework

Date: 2022-10-28

## Status

Accepted

## Context

DeCDK relies on a jsii type system for type resolution.
Obtaining the type system is comparatively time consuming.
This is acceptable when deCDK is run as an app.

However in test scenarios, where the global context has to be re-created for every test file, it becomes prohibitively expensive.
Other required setup tasks have similar drawbacks and are I/O or processing intensive. To counter these issues, we already cache resource intensive setup tasks per test file.
Additionally all tests are run in band as this improved the speed and stability of tests. Previously, with using parallel worker based tests, we encountered random test failures and slowness.
In future we might add additional libraries or further resource intensive processing to the setup. We can also expect to add many more test cases. Both would cause the test run time to increase significantly.

The main solution to avoid prohibitively long test run times in this scenario, is to do any setup only once.
It would require all tests to use a single, shared global context.
Using Jest, the only option to achieve this is to have all test cases in a single file. However this will likely become unmanageable in future, even with the trade-off to use a small number of test files (at the cost of longer run times).
Alternatively we can migrate the project to a test framework that supports a shared global context for all test cases. One popular option is the [Mocha test framework](https://mochajs.org/).

## Decision

We use Mocha as Testing Framework.

We use Jest's `expect` as assertion library.

## Consequences

All test cases are run in band, using the same global context.
Additional care has to be taken when operating on the global context to ensure tests are still valid.

Time consuming tasks like loading the jsii type system will only be done once and shared between all test cases.

The combination of Mocha and expect does not cover the full Jest feature-set.
We will have to configure additional packages to extend the assertion functionality if need.
Switching to a more comprehensive assertion library like `Chai` is also an option.
