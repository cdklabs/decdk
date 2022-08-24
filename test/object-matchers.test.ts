import {
  PSEUDO_PARAMETER_NAMES,
  IntrinsicFunctionsMatcher,
  DependsOnMatcher,
  FnGetAttMatcher,
  FnSubMatcher,
  RefMatcher,
} from '../src/object-matchers';

describe('Pattern matching', () => {
  describe('Ref', () => {
    test('matches resource name and returns it', () => {
      const data = { Ref: 'bar' };
      const matcher = new RefMatcher([], ['bar']);

      expect(matcher.match(data)).toEqual([
        {
          type: 'Ref',
          target: 'bar',
        },
      ]);
    });

    test('matches parameter name and returns nothing', () => {
      const data = { Ref: 'bar' };
      const matcher = new RefMatcher(['bar'], []);

      expect(matcher.match(data)).toEqual([]);
    });

    test('matches nothing and throws an error', () => {
      const data = { Ref: 'somethingElse' };
      const matcher = new RefMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        "'somethingElse' must be either a parameter name or a resource name"
      );
    });

    test('matches pseudo-parameters and returns nothing', () => {
      PSEUDO_PARAMETER_NAMES.forEach((parameterName) => {
        const data = { Ref: parameterName };
        const matcher = new RefMatcher([], []);

        expect(matcher.match(data)).toEqual([]);
      });
    });

    test('throws when it matches a Ref with the incorrect structure', () => {
      const data = { Ref: 123 };
      const matcher = new RefMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        "The target of a 'Ref' call must be a string"
      );
    });

    test('ignores any other structure', () => {
      const data = { foo: 'bar' };
      const matcher = new RefMatcher(['foo'], ['bar']);

      expect(matcher.match(data)).toEqual([]);
    });
  });

  describe('FnGetAtt', () => {
    test('matches resource name and returns it', () => {
      const data = { 'Fn::GetAtt': ['foo', 'bar'] };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(matcher.match(data)).toEqual([
        {
          type: 'FnGetAtt',
          target: 'foo',
        },
      ]);
    });

    test('matches nothing and throws an error', () => {
      const data = { 'Fn::GetAtt': ['somethingElse', 'bar'] };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(() => matcher.match(data)).toThrow(
        "'somethingElse' must be either a parameter name or a resource name"
      );
    });

    test('array does not contain exactly two elements', () => {
      const data = { 'Fn::GetAtt': ['foo'] };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(() => matcher.match(data)).toThrow(
        'The value Fn::GetAtt must be an array with two elements'
      );
    });

    test('array contains non-string elements', () => {
      const data = { 'Fn::GetAtt': ['foo', 123] };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(() => matcher.match(data)).toThrow(
        'The value Fn::GetAtt must be contain only strings'
      );
    });

    test('value is not an array', () => {
      const data = { 'Fn::GetAtt': 'oi!' };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(() => matcher.match(data)).toThrow(
        'The value Fn::GetAtt must be an array'
      );
    });

    test('ignores any other structure', () => {
      const data = { foo: 'bar' };
      const matcher = new FnGetAttMatcher(['foo']);

      expect(matcher.match(data)).toEqual([]);
    });
  });

  describe('Fn::Sub', () => {
    test('string has no variables', () => {
      const data = {
        'Fn::Sub': ['The quick brown fox'],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(matcher.match(data)).toEqual([]);
    });

    test('matches a single resource name and returns it', () => {
      const data = {
        'Fn::Sub': ['Something about ${foo} and ${bar}'],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(matcher.match(data)).toEqual([
        {
          target: 'bar',
          type: 'FnSub',
        },
      ]);
    });

    test('matches multiple resource names and returns them', () => {
      const data = {
        'Fn::Sub': ['Something about ${foo}, ${bar} and ${baz}'],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar', 'baz']);

      expect(matcher.match(data)).toEqual([
        {
          target: 'bar',
          type: 'FnSub',
        },
        {
          target: 'baz',
          type: 'FnSub',
        },
      ]);
    });

    test('matches nothing and throws an error', () => {
      const data = {
        'Fn::Sub': ['Something about ${something} and ${somethingElse}'],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        "The following variables are neither resources nor parameter names: 'something', 'somethingElse'"
      );
    });

    test('matches only parameter names and returns nothing', () => {
      const data = {
        'Fn::Sub': ['Something about ${foo} and ${bar}'],
      };
      const matcher = new FnSubMatcher(['foo', 'bar'], []);

      expect(matcher.match(data)).toEqual([]);
    });

    test('matches variables in the local variable map and returns nothing', () => {
      const data = {
        'Fn::Sub': [
          'Something about ${domain} and ${port}',
          { domain: 'example.com', port: 8080 },
        ],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(matcher.match(data)).toEqual([]);
    });

    test('first element of the value is not a string', () => {
      const data = {
        'Fn::Sub': [123],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        'The first element of the Fn::Sub target must be a string.'
      );
    });

    test('second element of the value is present and is not an key-value list', () => {
      const data = {
        'Fn::Sub': [
          'Something about ${domain} and ${port}',
          { domain: { anotherLevel: 'bla' } },
        ],
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        'The second element of the Fn::Sub target must be a key-value list.'
      );
    });

    test('target is not an array', () => {
      const data = {
        'Fn::Sub': 'oi!',
      };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(() => matcher.match(data)).toThrow(
        'The Fn::Sub target must be an array.'
      );
    });

    test('ignores any other structure', () => {
      const data = { foo: 'bar' };
      const matcher = new FnSubMatcher(['foo'], ['bar']);

      expect(matcher.match(data)).toEqual([]);
    });
  });

  describe('DependsOn', () => {
    test('matches a single resource name and returns it', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: 'my-first-decdk-repo',
        },
        DependsOn: 'Key',
      };
      const matcher = new DependsOnMatcher(['Key', 'Project', 'Foo']);

      expect(matcher.match(data)).toEqual([
        {
          target: 'Key',
          type: 'DependsOn',
        },
      ]);
    });

    test('matches multiple resource names and returns them', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: 'my-first-decdk-repo',
        },
        DependsOn: ['Key', 'Project'],
      };
      const matcher = new DependsOnMatcher(['Key', 'Project', 'Foo']);

      expect(matcher.match(data)).toEqual([
        {
          target: 'Key',
          type: 'DependsOn',
        },
        {
          target: 'Project',
          type: 'DependsOn',
        },
      ]);
    });

    test('does not match and throw error', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: 'my-first-decdk-repo',
        },
        DependsOn: ['Key', 'Project'],
      };
      const matcher = new DependsOnMatcher(['Foo', 'Bar']);

      expect(() => matcher.match(data)).toThrow(
        'DependsOn values must be resource names.'
      );
    });

    test('ignores objects that do not have a DependsOn', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: 'my-first-decdk-repo',
        },
      };
      const matcher = new DependsOnMatcher(['Key']);

      expect(matcher.match(data)).toEqual([]);
    });

    test('ignores any other structure', () => {
      const data = { foo: 'bar' };
      const matcher = new DependsOnMatcher(['Key', 'Project', 'Foo']);

      expect(matcher.match(data)).toEqual([]);
    });
  });

  describe('Composition', () => {
    test('matches all references', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: { 'Fn::GetAtt': ['Repo', 'name'] },
          node: { Ref: 'Node' },
          foo: [{ Ref: 'Node' }, { Ref: 'Key' }],
        },
        DependsOn: 'Key',
      };

      const matcher = new IntrinsicFunctionsMatcher(
        ['Foo', 'Bar'],
        ['Key', 'Node', 'Repo', 'Pipeline']
      );

      expect(matcher.match(data)).toEqual([
        {
          target: 'Key',
          type: 'DependsOn',
        },
        {
          target: 'Repo',
          type: 'FnGetAtt',
        },
        {
          target: 'Node',
          type: 'Ref',
        },
        {
          target: 'Node',
          type: 'Ref',
        },
        {
          target: 'Key',
          type: 'Ref',
        },
      ]);
    });

    test('matches nothing', () => {
      const data = {
        Type: 'aws-cdk-lib.aws_codecommit.Repository',
        Properties: {
          repositoryName: 'foo',
        },
      };

      const matcher = new IntrinsicFunctionsMatcher(
        ['Foo', 'Bar'],
        ['Key', 'Node', 'Repo', 'Pipeline']
      );

      expect(matcher.match(data)).toEqual([]);
    });
  });
});
