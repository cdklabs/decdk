test('invalid schema will fail', () => {
  // GIVEN
  const template = {
    $schema: '../cdk.schema.json',
    Resources: {
      VPC: {
        Type: 'aws-cdk-lib.aws_ec2.Vpc',
        Properties: {
          banana: true,
        },
      },
    },
  };

  // THEN
  expect(template).not.toBeValidTemplate();
});
