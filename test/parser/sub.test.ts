import * as fc from 'fast-check';
import { analyzeSubPattern, SubFragment } from '../../src/parser/private/sub';

/**
 * The string that goes into an { Fn::Sub } expression
 */
const subFormatString = fc.stringOf(
  fc.constantFrom('${', '}', 'A', '', '!', '.'),
  { maxLength: 10 }
);

test('test analyzesubpattern', () => {
  const parts = analyzeSubPattern('${AWS::StackName}-LogBucket');
  expect(parts).toEqual([
    { type: 'ref', logicalId: 'AWS::StackName' },
    { type: 'literal', content: '-LogBucket' },
  ] as SubFragment[]);
});

test('parsing and reconstituting are each others inverse', () => {
  fc.assert(
    fc.property(subFormatString, fc.context(), (s, ctx) => {
      const frags = analyzeSubPattern(s);
      ctx.log(JSON.stringify(frags));
      return s === reconstitutePattern(frags);
    })
  );
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
