import queryString from '@/services/query-string';

describe('fromString', () => {
  it('removes prefixes', () => {
    expect(queryString.fromString('p_a=b'))
      .toHaveProperty('a');
  });

  it('ignores non-parameters', () => {
    expect(queryString.fromString('p_a=b&utm=123'))
      .not.toHaveProperty('utm');
  });

  it('handles date ranges', () => {
    expect(queryString.fromString('p_created_at.start=2019-01-01&p_created_at.end=2019-02-01')).toEqual({
      created_at: {
        start: '2019-01-01',
        end: '2019-02-01',
      },
    });
  });
});

describe('toString', () => {
  it('adds prefixes', () => {
    expect(queryString.toString({
      a: 'b',
    })).toEqual('p_a=b');
  });

  it('handles date ranges', () => {
    expect(queryString.toString({
      created_at: {
        start: '2019-01-01',
        end: '2019-02-01',
      },
    })).toEqual('p_created_at.start=2019-01-01&p_created_at.end=2019-02-01');
  });
});
