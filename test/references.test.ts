import { Match } from 'aws-cdk-lib/assertions';
import { Template } from '../src/parser/template';
import { Testing } from './util';

test('can references L2 construct from L1 resource', async () => {
  // GIVEN
  const source = {
    Resources: {
      MyBucket: {
        Type: 'aws-cdk-lib.aws_s3.Bucket',
      },
      MyFunction: {
        Type: 'AWS::Lambda::Function',
        Properties: {
          Runtime: 'nodejs16.x',
          Handler: 'index.handler',
          Code: {
            ZipFile:
              'exports.handler = function(event) { console.log("hello world!"); }',
          },
          Description: { Ref: 'MyBucket' },
        },
      },
    },
  };
  const template = await Testing.template(Template.fromObject(source));

  // THEN
  expect(source).toBeValidTemplate();
  template.hasResourceProperties('AWS::Lambda::Function', {
    Description: {
      Ref: Match.stringLikeRegexp('^MyBucket.{8}$'),
    },
  });
});
