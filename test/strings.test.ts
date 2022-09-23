import { splitPath } from '../src/strings';

describe('strings', () => {
  test('splits by dots', () => {
    const [init, last] = splitPath('path.to.method');
    expect(init).toEqual(['path', 'to']);
    expect(last).toEqual('method');
  });

  test('string with not dots', () => {
    const [init, last] = splitPath('method');
    expect(init).toEqual([]);
    expect(last).toEqual('method');
  });

  test('empty string', () => {
    const [init, last] = splitPath('');
    expect(init).toEqual([]);
    expect(last).toEqual('');
  });

  test('dots in a row', () => {
    const [init, last] = splitPath('path...to..method');
    expect(init).toEqual(['path', '', '', 'to', '']);
    expect(last).toEqual('method');
  });
});
