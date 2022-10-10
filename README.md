# deCDK - Declarative CDK

[![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

Define AWS CDK applications declaratively.

This tool reads CloudFormation-like JSON/YAML templates which can contain both normal CloudFormation
resources (`AWS::S3::Bucket`) and also reference AWS CDK resources (`aws-cdk-lib.aws_s3.Bucket`).

## Getting Started

Install the AWS CDK CLI and the `decdk` tool:

```console
npm i -g aws-cdk decdk
```

This is optional (but highly recommended): You can use `decdk-schema` to generate a JSON schema and use it for IDE
completion and validation:

```console
decdk-schema > cdk.schema.json
```

Okay, we are ready to begin with a simple example. Create a file called `hello.json`:

```json
{
  "$schema": "./cdk.schema.json",
  "Resources": {
    "MyQueue": {
      "Type": "aws-cdk-lib.aws_sqs.Queue",
      "Properties": {
        "fifo": true
      }
    }
  }
}
```

Now, you can use it as a CDK app (you'll need to `npm install -g aws-cdk`):

```console
$ cdk -a "decdk hello.json" synth
Resources:
  MyQueueE6CA6235:
    Type: AWS::SQS::Queue
    Properties:
      FifoQueue: true
    Metadata:
      aws:cdk:path: hello2/MyQueue/Resource
```

As you can see, the deCDK has the same semantics as a CloudFormation template. It contains a section for "Resources",
where each resource is defined by a *type* and a set of *properties*. deCDK allows using constructs from AWS Construct
Library in templates by identifying the class name (in this case `aws-cdk-lib.aws_sqs.Queue`).

When deCDK processes a template, it identifies these special resources and under-the-hood, it instantiates an object of
that type, passing in the properties to the object's constructor. All CDK constructs have a uniform signature, so this
is actually straightforward.

## Development

### Examples/Tests

When you build this module, it will produce a `cdk.schema.json` file at the root, which is referenced by the examples in
the [`examples`](./examples) directory. This directory includes working examples of deCDK templates for various areas.
We also snapshot-test those to ensure there are no unwanted regressions.

### Running local code

You can execute `decdk` using the current TypeScript code, without having to build the project. Provide this as your app
argument to `cdk`:

```sh
cdk -a "ts-node src/decdk.ts template.json" synth
```

## Features

### CloudFormation Resources

If deCDK doesn't identify a resource type as a CDK resource, it will just pass it through to the resulting output. This
means that any existing CloudFormation/SAM resources (such as `AWS::SQS::Queue`) can be used as-is.

The decdk JSON schema will simply pass through any resources that have a type that includes `::`, so don't expect any
validation of raw CloudFormation resource properties.

### Declaring constructs using method calls

In the **Getting Started** section you saw how to declare a construct using `Properties`, which are mapped to the
construct's "Props" interface. This is the most common use case, but there are other ways of declaring constructs,
using method calls.

#### Static factory methods

[//]: # (TODO Talk about nested properties)

The CDK construct library offers many static factory methods to create constructs. Usually these are import methods, to
incorporate existing constructs into your CDK application (e.g., `aws-cdk-lib.aws_efs.AccessPoint.fromAccessPointId`)
. The declarative version of these methods uses the property `Call`:

```json
{
  "Resources": {
    "MyAccessPoint": {
      "Call": {
        "aws-cdk-lib.aws_efs.AccessPoint.fromAccessPointId": "some-access-point-id"
      }
    }
  }
}
```

There are a number of things to notice in this example. First, there is no `Type` declaration. Remember that when you
declare a construct using its properties, the type is required, since the set of properties alone is not enough to
uniquely determine which construct you are trying to declare. But the return type of a method call is unambiguous and
can be inferred by deCDK. Nonetheless, if you still want to declare the type, as a form of
documentation, it's perfectly valid to do so. Just keep in mind that the declared type must match the method's
return type. Otherwise, deCDK will stop synthesis and give you an error message.

The second point to notice is that the method name used here is actually its fully qualified name (FQN). Again, this
has to do with being unambiguous. A method name, by itself, may refer to different methods, from different classes.
The FQN, on the other hand, is unique.

The third point is related to the arguments passed to this method. The signature of `fromAccessPointId` has three
parameters: `scope`, `id` and  `accessPointId`, but we are only passing the third one: the access point ID. The first
two are
inferred by deCDK; for the scope, deCDK uses a stack that it creates during the processing of the template to which
all constructs are added; for the ID, it uses the logical ID of the construct being declared (`"MyAccessPoint"` in
this case).

If you need to provide these arguments explicitly, you can do it using the new (CDK specific) intrinsic function
`CDK::Args` and pseudo parameter `CDK::Scope`. Rewriting the example above, but with all arguments being explicitly
defined, it becomes:

```json
{
  "Resources": {
    "MyAccessPoint": {
      "Call": {
        "aws-cdk-lib.aws_efs.AccessPoint.fromAccessPointId": {
          "CDK::Args": [
            {
              "Ref": "CDK::Scope"
            },
            "MyAccessPoint",
            "some-access-point-id"
          ]
        }
      }
    }
  }
}
```

`CDK::Args` is an intrinsic function that just returns the array passed to it. But it signals to deCDK to turn off its
inference mechanism and just use the explicitly provided arguments. `CDK::Scope` is a reference to the internal stack.

And finally, look at the list of arguments in the first example. In the general case, you have to pass an array, in
the same order as the declared parameters. But in cases where it's legal to pass a single argument (either because the
other arguments were inferred or because there is only one required parameter), the list syntax may be omitted and
the argument passed directly.

#### Instance factory methods

In addition to the static factory methods, there are also _instance_ factory methods that produce constructs. For
example, you can create a Lambda `Alias` by calling the method `addAlias` on an instance of a `Function` construct.
The declarative way to call this method is:

```yaml
Resources:
  Alias:
    'On': MyFunction
    Call:
      addAlias: live

  MyFunction:
    Type: aws-cdk-lib.aws_lambda.Function
    Properties:
    # ... List of properties
```

The syntax is very similar to the static method case, with two differences: you have to specify the logical ID
of the construct that is receiving this call (the value of the `On` property), and the method name (inside `Call`)
is the method's simple name, rather than its FQN.

> ⚠️ **Experimental feature**: the string `On` is a keyword in YAML, equivalent to `true`. So you have to wrap it in
> quotes to use it as a property name. Since this is a bit cumbersome, expect this name to change in the near future.

You can also call instance method in _nested properties_:

```yaml
Resources:
  AllowFromEverywhere:
    'On': Listener # of type aws-cdk-lib.aws_elasticloadbalancingv2.ApplicationListener
    Call:
      connections.allowDefaultPortFromAnyIpv4:
        - Open to the world
```

### CDK classes that are not constructs

In a CDK application, many of the objects you create and manipulate are not constructs; they are not added
directly to a stack, and they don't correspond to a CloudFormation resource. For instance, to create an
`aws-cdk-lib.aws_cloudwatch.Dashboard`, which is a construct, the CDK construct library provides the interface
`aws-cdk-lib.aws_cloudwatch.IWidget`, with many non-construct implementations (`AlarmStatusWidget`, `TextWidget` etc).
These classes abstract
certain concepts and improve the ergonomics of the API.

If the class has a public constructor with less than two required parameters (e.g., `TextWidget`), you can pass the
argument via `Properties`:

```json
{
  "Resources": {
    "TitleWidget": {
      "Type": "aws-cdk-lib.aws_cloudwatch.TextWidget",
      "Properties": {
        "markdown": "# Operational Metrics"
      }
    },
    "ServiceDashboard": {
      "Type": "aws-cdk-lib.aws_cloudwatch.Dashboard",
      "Properties": {
        "widgets": [
          [
            {
              "Ref": "TitleWidget"
            }
          ]
        ]
      }
    }
  }
}
```

> **Work in progress**: it is possible to support public constructors with two or more required parameters, but it
> requires careful design of the syntax. Still under investigation.

Notice the use of the `Ref` intrinsic function, that works basically the same way as in raw CloudFormation resources,
although there are some nuances to this function in the context of deCDK, that are explained in **References**.

Non-construct objects can also be created with method calls:

```yaml
Resources:
  BusinessLogic:
    Call:
      aws-cdk-lib.aws_lambda.Code.fromInline: "exports.handler = function(event, ctx, cb) { return cb(null, \"hi\"); }"
```

So far, we have seen how to create non-construct instances at the top level, with associated logical IDs, just like you
would do for constructs. This is useful in cases where you want to create an instance to be reused later. More often
than not, however, there is no need for re-use. A simpler alternative for these cases is to declare the instance
in-line:

```yaml
Resources:
  MyBucket:
    Type: aws-cdk-lib.aws_s3.Bucket

  MyLambda:
    Type: aws-cdk-lib.aws_lambda.Function
    Properties:
      runtime: NODEJS_16_X
      code:
        aws-cdk-lib.aws_lambda.Code.fromBucket: # inline call
          - Ref: MyBucket
          - handler.zip
      # ... other properties
```

The syntax in this case is almost the same as for declaring the object at the top level. The difference is that the
context makes it clear that this is a method call. So there is no `Call` property wrapping it. The example above
also shows the use of an enum-like class (`aws-cdk-lib.aws_lambda.Runtime`) for the `runtime` property. These are
classes that have at least one static method. If the class also has static properties, the property names can be
used to reference the value. In this example, the string `"NODEJS_16_X"` is interpreted as a property
name (`aws-cdk-lib.aws_lambda.Runtime.NODEJS_16_X`). The same logic applies to proper enums, such
as `FunctionUrlAuthType`:

```yaml
Resources:
  MyFunction:
    Type: aws-cdk-lib.aws_lambda.Function
    Properties:
    # ... List of properties

  FunctionUrl:
    'On': MyFunction
    Call:
      addFunctionUrl:
        authType: AWS_IAM # from enum FunctionUrlAuthType
```

### References

[//]: # (TODO Expand on this)

The intrinsic function `Ref` can be used to reference any logical ID (the keys in the `Resources` section), with two
exceptions:

* When the value of the logical ID is the result of a `void` method call. For example:

```yaml
Resources:
  ConfigureAsyncInvokeStatement:
    'On': Alias # of type aws-cdk-lib.aws_lambda.Alias
    Call:
      configureAsyncInvoke:
        retryAttempts: 2
```

In this case, `ConfigureAsyncInvokeStatement` doesn't refer to anything. It is only necessary to keep the syntax for
statements consistent with the other types of method calls.

* When a CloudFormation resource or an L1 construct is referenced where an L2 construct is expected:

```yaml
Resources:
  Bucket:
    Type: "AWS::S3::Bucket"

  MyFunction:
    Type: "aws-cdk-lib.aws_lambda.Function",
    Properties:
      code:
        Ref: "Bucket" # an aws_s3.Bucket is expected here
      # ... other properties
```

> **Work in progress**: We are investigating the possibility of supporting the second case.

Notably, CDK constructs, that is, types that extend `cdk.Construct` or interfaces that extend `cdk.IConstruct`, can be
referenced from anywhere, even from CloudFormation resource declarations:

```yaml
Resources:
  CdkBucket:
    Type: "aws-cdk-lib.aws_s3.CfnBucket"

  CloudFormationFunction:
    Type: AWS::Lambda::Function
    Properties:
      Code:
        S3Bucket:
          Ref: CdkBucket
        S3Key: mycode.zip
      # ... other properties
```

### Polymorphism

Due to the decoupled nature of AWS, The AWS Construct Library highly utilizes polymorphism to expose rich APIs to users.
In many cases, APIs would accept an interface of some kind, and various AWS services provide an implementation for that
interface. deCDK is able to find all concrete implementation of an interface or an abstract class and offer the user an
enum-like experience. The following example shows how this approach can be used to define AWS Lambda events:

```json
{
  "Description": "A template creates a lambda function which can be invoked by an sns topic",
  "Resources": {
    "MyTopic": {
      "Type": "aws-cdk-lib.aws_sns.Topic"
    },
    "Table": {
      "Type": "aws-cdk-lib.aws_dynamodb.Table",
      "Properties": {
        "partitionKey": {
          "name": "ID",
          "type": "STRING"
        },
        "stream": "NEW_AND_OLD_IMAGES"
      }
    },
    "HelloWorldFunction": {
      "Type": "aws-cdk-lib.aws_lambda.Function",
      "Properties": {
        "handler": "app.hello_handler",
        "runtime": "PYTHON_3_6",
        "code": {
          "aws-cdk-lib.aws_lambda.Code.fromAsset": "examples/lambda-handler"
        },
        "environment": {
          "Param": "f"
        },
        "events": [
          {
            "aws-cdk-lib.aws_lambda_event_sources.DynamoEventSource": [
              {
                "Ref": "Table"
              },
              {
                "startingPosition": "TRIM_HORIZON"
              }
            ]
          },
          {
            "aws-cdk-lib.aws_lambda_event_sources.ApiEventSource": [
              "GET",
              "/hello"
            ]
          },
          {
            "aws-cdk-lib.aws_lambda_event_sources.ApiEventSource": [
              "POST",
              "/hello"
            ]
          },
          {
            "aws-cdk-lib.aws_lambda_event_sources.SnsEventSource": {
              "Ref": "MyTopic"
            }
          }
        ]
      },
      "Overrides": [
        {
          "ChildConstructPath": "ServiceRole",
          "Update": {
            "Path": "Properties.Description",
            "Value": "This value has been overridden"
          }
        }
      ]
    }
  }
}
```

The keys in the "events" array are all fully qualified names of classes in the AWS Construct Library. The declaration is
"Array<IEventSource>". When deCDK deconstructs the objects in this array, it will create objects of these types and pass
them in as IEventSource objects.

### `Fn::GetAtt` and `CDK::GetProp`

CloudFormation provides the `Fn::GetAtt` intrinsic function to access the value of resource attributes. With deCDK, 
this function works the same way, whether it's being referenced from a CloudFormation resource
or from a CDK construct:

```yaml
Resources:
  SourceBucket:
    Type: AWS::S3::Bucket

  DestinationBucket:
    Type: aws-cdk-lib.aws_s3.Bucket

  BucketDeployment:
    Type: aws-cdk-lib.aws_s3_deployment.BucketDeployment
    Properties:
      destinationBucket:
        Ref: DestinationBucket
      sources:
        - aws-cdk-lib.aws_s3_deployment.Source.jsonData:
            - 'my/config.json'
            - website_url:
                "Fn::GetAtt":
                  - SourceBucket # reference to a CloudFormation resource
                  - WebsiteUrl
```

CDK constructs can also be the _target_ of `Fn::GetAtt`, in which case the attribute being referenced belongs to the
construct's default child. For example, suppose you want to export the `WebsiteUrl` property of the 
`DestinationBucket` construct defined in the example above:

```yaml
Resources:
  # ... Same resources as in the previous example

Outputs:
  BucketUrl:
    Description: Website URL of the destination bucket
    Value:
      "Fn::GetAtt":
        - DestinationBucket # reference to a CDK construct
        - WebsiteUrl # but this is the name of a property of its underlying CFN resource 
```

To reference a property of a CDK construct itself, however, you have to use the new intrinsic function `CDK::GetProp`:

```yaml
Resources:
  MyHandler:
    Type: aws-cdk-lib.aws_lambda.Function
    Properties:
      # ... List of properties

Outputs:
  HelloWorldApi:
    Description: API Gateway endpoint URL for Prod stage for Hello World function
    Value:
      CDK::GetProp:
        - MyHandler
        - runtime.name # nested properties are also allowed
```

`CDK::GetProp` cannot be used with a CloudFormation resource as a target. This will always result in an error.

To sum up, the behavior is:

| Intrinsic function | Target is a CDK construct                                                                                     | Target is a CFN resource           |
|--------------------|---------------------------------------------------------------------------------------------------------------|------------------------------------|
| `CDK::GetProp`     | Returns the value of the property                                                                             | **Error!**                         |
| `Fn::GetAtt`       | Returns the value of the attribute of the underlying CFN resource (inferred from the `defaultChild` property) | Returns the value of the attribute |
