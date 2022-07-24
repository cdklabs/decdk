# Proposed options for function call syntax

One of the areas currently not covered by deCDK is function invocation. In many places in the CDK, to achieve the desired result, it's necessary to call methods in constructs to either mutate them or to produce other resources (and sometimes both).

Each section below refers to a specific aspect of function calls. For each one, you can see the options we have come up with to address it. The options are not necessarily mutually exclusive. For example, regarding the location of the function call, we could, in theory, have all three options available for use.

## Resource typing

Explicit, but optional, type declaration for resources constructed by a function call:

```yaml
Resources:
  MyAccessPoint:
    Type: AWSCDK::Efs::AccessPoint
    From:
      AWSCDK::Invoke:
        Target:
          Ref: MyFileSystem # A resource of type AWSCDK::Efs::FileSystem
        Function: 'AddAccessPoint'
        Arguments:
            - 'AccessPoint'
```

A special type name to indicate that the result will be inferred:

```yaml
  MyAccessPoint:
    Type: AWSCDK::Invoke
    Target:
      Ref: MyFileSystem
    Function: 'AddAccessPoint'
    Arguments:
        - 'AccessPoint'
```

## Functions without return values

"Assigning" to a resource name of type `AWSCDK::Void`:

```yaml
Resources:
  MyBucket:
    Type: AWSCDK::S3::Bucket
    Properties: # ...
  MyBucketGrantResult: # Techinically a resource name, but one that can't be used as a reference anywhere
    Type: AWSCDK::Void
    From:
      AWSCDK::Invoke:
        Target:
          Ref: MyBucket
        Function: 'GrantRead'
        Arguments: # ...
```

Calling the function in a special section (`After`) within the resource definition:

```yaml
Resources:
  MyBucket:
    Type: AWSCDK::S3::Bucket
    Properties: # ...
    After:
      - AWSCDK::Invoke:
          # The Target is inferred from the scope
          Function: 'GrantRead'
          Arguments: # ...
```

## Location of the function call

Declared as a normal resource:

```yaml
Resources:
  MyAccessPoint:
    Type: # either inferred or explicitly declared
    # ...
    # Some initialization syntax
```

Inline:

```yaml
Resources:
  MyLambda:
    Type: AWSCDK::Lambda::Function
    Properties:
      # ...
  MyDataSource:
    Type: AWSCDK::AppSync::LambdaDataSource
    Properties:
      # ...
      Lambda: # expects an IFunction
        AWSCDK::Invoke:
          Target:
            Ref: MyLambda
          Function: 'AddAlias' # returns an Alias, which is an IFunction
          Arguments:
            - 'live'
```

In a separate section:

```yaml
Resources:
  # List of resources
FunctionCalls:
  - Target:
      Ref: MyBucket
    Function: 'GrantRead'
    Arguments: # ...
  - Target:
      Ref: MyFunction
    Function: 'AddAlias'
    Arguments: 'live'
    AssignTo: MyAlias # This name can be referenced elsewhere as a regular resource
```

## Conciseness

All elements explicitly defined using field names:

```yaml
Resources:
  Bla:
    Type: # either inferred or explicitly declared
    Target:
      Ref: MyBucket
    Method: 'ArnForObjects'
    Arguments: 
      - "*.txt"
```

Resource names and methods inferred from the context:

```yaml
Resources:
  Bla:
    Type: # either inferred or explicitly declared
    Target: MyBucket # using the name directly (without Ref:). The context makes it clear that this is a reference
    ArnForObjects: # the context also makes it clear that this is a function name...
      - "*.txt" # and that this is the parameter list
```

Using a fully qualified name to identify a method call (with type inference):

```yaml
Resources:
  Bla:
    Type: # either inferred or explicitly declared
    From: 
      - MyBucket::ArnForObjects
      - "*.txt" # and that this is the parameter list
```
