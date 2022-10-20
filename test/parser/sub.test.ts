import { expect } from 'expect';
import * as fc from 'fast-check';
import { analyzeSubPattern, SubFragment } from '../../src/parser/private/sub';

/**
 * The string that goes into an { Fn::Sub } expression
 */
const subFormatString = fc.stringOf(
  fc.constantFrom('${', '}', 'A', '', '!', '.'),
  { maxLength: 10 }
);

test('parsing and reconstituting are each others inverse', () => {
  fc.assert(
    fc.property(subFormatString, fc.context(), (s, ctx) => {
      const frags = analyzeSubPattern(s);
      ctx.log(JSON.stringify(frags));
      return s === reconstitutePattern(frags);
    })
  );
});

test('references are extracted', () => {
  const parts = analyzeSubPattern('${AWS::StackName}-LogBucket');
  expect(parts).toEqual([
    { type: 'ref', logicalId: 'AWS::StackName' },
    { type: 'literal', content: '-LogBucket' },
  ] as SubFragment[]);
});

test('references can have spaces', () => {
  const parts = analyzeSubPattern('${ AWS::StackName }-LogBucket');
  expect(parts).toEqual([
    { type: 'ref', logicalId: 'AWS::StackName' },
    { type: 'literal', content: '-LogBucket' },
  ] as SubFragment[]);
});

test('literals are preserved without !', () => {
  const parts = analyzeSubPattern('before-${!AWS::Region}-LogBucket');
  expect(parts).toEqual([
    { type: 'literal', content: 'before-' },
    { type: 'literal', content: '${!AWS::Region}' },
    { type: 'literal', content: '-LogBucket' },
  ] as SubFragment[]);
});

test('unclosed ${ is preserved', () => {
  const parts = analyzeSubPattern('start-${ end');
  expect(parts).toEqual([
    { type: 'literal', content: 'start-${ end' },
  ] as SubFragment[]);
});

test('literal pattern can contain spaces around !', () => {
  const parts = analyzeSubPattern(
    '${!NoSpace}${ ! BothSpace}${! AfterSpace}${ !BeforeSpace}${!EndSpace }'
  );
  expect(parts).toEqual([
    { type: 'literal', content: '${!NoSpace}' },
    { type: 'literal', content: '${ ! BothSpace}' },
    { type: 'literal', content: '${! AfterSpace}' },
    { type: 'literal', content: '${ !BeforeSpace}' },
    { type: 'literal', content: '${!EndSpace }' },
  ] as SubFragment[]);
});

/**
 * Reconstitute a sub-string from a list of patterns
 */
function reconstitutePattern(frags: SubFragment[]): string {
  return frags
    .map((f) => {
      switch (f.type) {
        case 'literal':
          return f.content;
        case 'ref':
          return `\${${f.logicalId}}`;
        case 'getatt':
          return `\${${f.logicalId}.${f.attr}}`;
      }
    })
    .join('');
}
