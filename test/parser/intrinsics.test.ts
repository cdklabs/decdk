import { Template } from '../../src/parser/template';
import '../util';

test('FnGetProp', async () => {
  // GIVEN
  const template = await Template.fromObject({
    Resources: {
      Bucket: {
        Type: 'aws-cdk-lib.aws_s3.Bucket',
      },
      Topic: {
        Type: 'aws-cdk-lib.aws_sns.Topic',
        Properties: {
          displayName: { 'CDK::GetProp': ['Bucket', 'bucketName'] },
          topicName: { 'CDK::GetProp': 'Bucket.bucketName' },
        },
      },
    },
  });

  // THEN
  const topic = template.resource('Topic');
  expect(template.template).toBeValidTemplate();
  expect(topic.properties).toMatchObject({
    displayName: {
      type: 'intrinsic',
      fn: 'getProp',
      logicalId: 'Bucket',
      property: 'bucketName',
    },
    topicName: {
      type: 'intrinsic',
      fn: 'getProp',
      logicalId: 'Bucket',
      property: 'bucketName',
    },
  });
});
