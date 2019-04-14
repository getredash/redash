import queryString from '@/services/query-string';

describe('fromString', () => {
  it('groups query parameters', () => {
    expect(queryString.fromString('p_a=b'))
      .toHaveProperty('queryParameters');
  });

  it('retains non-query parameters', () => {
    expect(queryString.fromString('a=b'))
      .toHaveProperty('a');
  });

  it('removes prefixes', () => {
    expect(queryString.fromString('p_a=b').queryParameters)
      .toHaveProperty('a');
  });

  it('handles date ranges', () => {
    const fromString = queryString.fromString('p_created_at.start=2019-01-01&p_created_at.end=2019-02-01');
    expect(fromString.queryParameters).toEqual({
      created_at: {
        start: '2019-01-01',
        end: '2019-02-01',
      },
    });
  });
});

describe('toString', () => {
  it('adds prefixes to query parameters', () => {
    expect(queryString.toString({
      queryParameters: {
        a: 'b',
      },
    })).toEqual('p_a=b');
  });

  it('does not add prefixes to non-query parameters', () => {
    expect(queryString.toString({
      a: 'b',
    })).toEqual('a=b');
  });

  it('handles date ranges', () => {
    expect(queryString.toString({
      queryParameters: {
        created_at: {
          start: '2019-01-01',
          end: '2019-02-01',
        },
      },
    })).toEqual('p_created_at.start=2019-01-01&p_created_at.end=2019-02-01');
  });
});
