import queryString from '@/services/query-string';

it('removes prefixes', () => {
  expect(queryString.fromString('p_a=b')).toHaveProperty('a');
});

it('ignores non-parameters', () => {
  expect(queryString.fromString('p_a=b&utm=123')).not.toHaveProperty('utm');
});
