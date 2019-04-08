import queryString from '@/services/query-string';

describe('fromString', () => {
  it('removes prefixes', () => {
    expect(queryString.fromString('p_a=b')).toHaveProperty('a');
  });

  it('ignores non-parameters', () => {
    expect(queryString.fromString('p_a=b&utm=123')).not.toHaveProperty('utm');
  });
});

describe('toString', () => {
  it('adds prefixes', () => {
    expect(queryString.toString({ a: 'b' })).toEqual('p_a=b');
  });
});

