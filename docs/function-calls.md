# Proposed options for function call syntax

One of the areas currently not covered by deCDK is function invocation. In many places in the CDK, to achieve the desired result, it's necessary to call methods in constructs to either mutate them or to produce other resources (and sometimes both). Here's an example code that captures many of the function call variations:

```ts
const myBucket = new s3.Bucket(this, {
  encryption: s3.Encryption.KMS_MANAGED,
});

const myFunction = new lambda.Function {
  handler: 'index.handler',
  runtime: lambda.Runtime.NODEJS_14_X,
  enviornment: {
    OBJECT_ARN: myBucket.arnForObjects('data.json'),
  },
};

const myAlias = myFunction.addAlias('live');

const myAccountPrincipal = new iam.AccountPrincipal('1818188181818187272');

myAlias.addPermission('invoke-live-permission', {
  principal: myAccountPrincipal
});

myAlias.addAutoScaling({ maxCapacity: 50 });

myFunction.logStream.grantReadWrite(myAccountPrincipal);
```

This document lists a number of possible APIs for representing function calls in deCDK, with their respectives pros and cons. We hope to hear from the community on what they think about these options before setting out to implement any solution.

## `AWSCDK::Invoke` intrinsic function (Recommended by the CDK team)

Add a `AWSCDK::Invoke` intrinsic function that can be used to call arbitrary methods. It expects a `Resource`, a `Function`, an optional list of `Arguments`, and an optional `ReturnPath`. If the function being called returns a construct, then it can be added to the `Resources` section of the template. 

Example:

```yaml
Resources:
  MyFileSystem:
    Type: AWSCDK::Efs::FileSystem
    Properties:
      # ...
  MyAccessPoint: # this name can be referenced elsewhere in the template, as any other resource
    Type: AWSCDK::Efs::AccessPoint # this can probably be omitted
    From: # cannot be used in conjunction with Properties
      AWSCDK::Invoke: # when used with a From, the AWSCDK::Invoke can also be omitted
        Target:
          Ref: MyFileSystem
        Function: 'AddAccessPoint'
        Arguments:
            - 'AccessPoint'
    Tags: # ...
    DependsOn: # ...
```

This would produce the following TypeScript:

```ts
const MyFileSystem = new efs.Filesystem(stack, "MyFileSystem", { ... });
const MyAccessPoint = MyFileSystem.addAccessPoint("AccessPoint");
```

We can also allow `AWSCDK::Invoke` to be used "inline", wherever the appropriate return value types are expected. Here is an example where `AWSCDK::Invoke` is to call a function that returns an `Alias` to satisfy a property that expects an `IFunction`:

```yaml
Resources:
  MyLambda:
    Type: AWSCDK::Lambda::Function
    Properties:
      # ...
  MyDataSource:
    Type: AWSCDK::AppSync::LambdaDataSource
    Properties:
      Name: 'MyDataSource'
      Description: 'Data source description'
      Lambda: # expects an IFunction
        AWSCDK::Invoke:
          Target:
            Ref: MyLambda
          Function: 'addAlias' # returns an Alias, which is an IFunction
          Arguments:
            - 'live'
```

Here’s an example where a `AWSCDK::Invoke` is used with `ArnForObjects` to provide a value for a string property in a construct:

```yaml
Resources:
  MyBucket:
    Type: AWSCDK::S3::Bucket
  MyRole:
    Type: AWSCDK::IAM::Role 
    Properties:
      Description: # expects a string
        AWSCDK::Invoke:
          Target:
            Ref: MyBucket
          Function: 'ArnForObjects'
          Arguments:
            - "*.txt"
```

Not every function returns a value, though. In those cases, you will still declare a resource, but of the special type `AWSCDK::Void`:

```yaml
Resources:
  MyBucket:
    Type: AWSCDK::S3::Bucket
    Properties: # ...
  MyBucketGrantResult:
    Type: AWSCDK::Void
    From:
      AWSCDK::Invoke:
        Target:
          Ref: MyBucket
        Function: 'GrantRead'
        Arguments: # ...      

```

Although you can define a resource of type `AWSCDK::Void` and give it a name, you can never reference that name in the template.

### Syntactical simplifications

The syntax presented in the previous section is self descriptive, but slightly verbose. There are a number of inferences that can be made, reducing the amount of code necessary to declare a resource. The examples below show a progression towards a minimalist syntax.

With type inference:

```yaml
Resources:
  Bla:
    Type: AWSCDK::Invoke # using the same special type for all resources that result from function calls
    On:
      Ref: MyBucket
    Method: 'ArnForObjects'
    Arguments: 
      - "*.txt"
```

With inference of resource names and methods:

```yaml
Resources:
  Bla:
    Type: AWSCDK::Invoke
    On: MyBucket # using the name directly (without Ref:). The context makes it clear that this is a reference
      ArnForObjects: # the context also makes it clear that this is a function name...
        - "*.txt" # and that this is the parameter list
```

Using a fully qualified name to identify a method call:

```yaml
Resources:
  Bla:
    From: AWSCDK::Invoke::MyBucket::ArnForObjects
      - "*.txt" # and that this is the parameter list
```


Pros:

* Lets you call any instance method.
* Lets you call methods hidden behind properties since `Resource` can be a `Ref` or `GetAtt`.
* Lets you use any and all return values of methods.

Cons:

* It is unknown if this syntax aligns with the syntax the CFN team wants to use for user-defined functions (separate CFN Language Extension). Specifically, the arguments it takes, and which locations in the template the functions can be used in.
* May benefit from having `Variables` added to CloudFormation, which is not currently planned until 2023.



## `After` field

Add an `After` field on resources where function invocations can be listed. It expects a `Function`, `Arguments`, and an optional `PropertyPath`. `PropertyPath` can be used to specify that the function should be called on a nested property of the construct. All values returned by methods will ignored.

Example:

```yaml
Resources:
  MyAutoScalingGroup:
    Type: AWSCDK::AutoScaling::AutoScalingGroup
    Properties:
      # ...
    After: # new!
      #
      # equivalent to:
      # autoScalingGroup.scaleOnCpuUtilization('KeepSpareCpu', 50)
      #
      - Function: 'scaleOnCpuUtilization'
        Arguments:
          - 'KeepSpareCpu'
          - 50
      #
      # equivalent to:
      # autoScalingGroup.connections.addSecurityGroups(mySecurityGroup)
      #
      - PropertyPath: 'connections'
        Function: 'addSecurityGroups'
        Arguments:
          - Ref: MySecurityGroup
```

Pros:

* Lets you call any instance method.
* Lets you call methods on properties via PropertyPath .
* Intuitive location for users: function calls made on a resource are adjacent in the template to the definitions of that resource.

Cons:

* Does not let you make use the return value of function calls.


## `FunctionCalls` section

Add a new section, `FunctionCalls`, at the top level of the template.

Example:

```yaml
Resources:
  MyBucket:
    Type: AWSCDK::S3::Bucket
    Properties:
      BucketName: ExampleBucket
  MyLambda:
    Type: AWSCDK::Lambda::Function
    Properties:
      Handler: index.handler
      Runtime: NODEJS_14_X
      Code:
        FromInline:
          - 'exports.handler = function() { console.log("hello world"); }'
FunctionCalls:
  - Target:
      Ref: MyLambda
    Function: 'GrantRead'
    Arguments:
      - Ref: MyLambda
      - "*.txt"
  - Target:
      Fn::GetAtt: # myLambda.deadLetterQueue
        - MyLambda
        - DeadLetterQueue
    Function: 'GrantSendMessages'
    Arguments:
      - AWSCDK::IAM::AnyPrincipal {}
```

Pros:

* Lets you call any instance method.
* Lets you call methods hidden behind properties since Resource can be a Ref or GetAtt.
* Location of the function calls matches the actual execution order under the hood. It’s clear that 

Cons:

* It does not users use the return value of function calls.
* This syntax could conflict or introduce confusion with the potential future CloudFormation `Fn::Invoke` intrinsic. ("These CFN registry function calls use the AWSCDK::Invoke intrinsic, but these other ones [from deCDK] do not -- how come?")

