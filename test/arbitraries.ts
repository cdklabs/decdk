import * as fc from 'fast-check';

export namespace arb {
  /**
   * The string that goes into an { Fn::Sub } expression
   */
  export const subFormatString = fc.stringOf(
    fc.constantFrom('${', '}', 'A', '', '!', '.'),
    { maxLength: 10 }
  );
}
