import { Parameter } from '..';

describe('TextParameter', () => {
  let param;
  beforeEach(() => {
    param = Parameter.create({ name: 'param', title: 'Param', type: 'text' });
  });

  describe('normalizeValue', () => {
    test('converts Strings', () => {
      const normalizedValue = param.normalizeValue('exampleString'); // TODO: use faker??
      expect(normalizedValue).toBe('exampleString');
    });

    test('converts Numbers', () => {
      const normalizedValue = param.normalizeValue(3); // TODO: use faker??
      expect(normalizedValue).toBe('3');
    });

    describe('Empty values', () => {
      const emptyValues = [null, undefined, ''];

      test.each(emptyValues)('normalizes empty value \'%s\' as null', (emptyValue) => {
        const normalizedValue = param.normalizeValue(emptyValue);
        expect(normalizedValue).toBeNull();
        expect(param.isEmpty).toBeTruthy();
      });
    });
  });
});
