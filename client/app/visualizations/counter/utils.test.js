import { getCounterData } from './utils';

let dummy;

describe('Visualizations -> Counter -> Utils', () => {
  beforeEach(() => {
    dummy = {
      rows: [
        { city: 'New York City', population: 18604000 },
        { city: 'Shangai', population: 24484000 },
        { city: 'Tokyo', population: 38140000 },
      ],
      result: {
        counterLabel: '',
        counterValue: '',
        targetValue: null,
        counterValueTooltip: '',
        targetValueTooltip: '',
      },
    };
  });

  describe('getCounterData()', () => {
    test('no input returns empty result object', () => {
      const result = getCounterData();
      expect(result).toEqual({});
    });

    test('empty rows returns empty result object', () => {
      const result = getCounterData([]);
      expect(result).toEqual({});
    });

    describe('"Count rows" option is disabled', () => {
      test('No target and counter values return empty result', () => {
        const result = getCounterData(dummy.rows, {}, 'Vizualization Name');
        expect(result).toEqual({
          ...dummy.result,
          counterLabel: 'Vizualization Name',
          showTrend: false,
        });
      });

      test('"Counter label" overrides vizualization name', () => {
        const result = getCounterData(
          dummy.rows,
          { counterLabel: 'Counter Label' },
          'Vizualization Name',
        );
        expect(result).toEqual({
          ...dummy.result,
          counterLabel: 'Counter Label',
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" must be set to a correct non empty value', () => {
        const result = getCounterData(dummy.rows, { rowNumber: 3 });
        expect(result).toEqual({
          ...dummy.result,
          showTrend: false,
        });

        const result2 = getCounterData(dummy.rows, { counterColName: 'missingColumn' });
        expect(result2).toEqual({
          ...dummy.result,
          showTrend: false,
        });
      });

      test('"Counter Value Column Name" uses correct column', () => {
        const result = getCounterData(dummy.rows, {
          counterColName: 'population',
        });
        expect(result).toEqual({
          ...dummy.result,
          counterValue: '18,604,000.000',
          counterValueTooltip: '18,604,000',
          showTrend: false,
        });
      });

      test('Counter and target values return correct result including trend', () => {
        const result = getCounterData(dummy.rows, {
          rowNumber: 1,
          counterColName: 'population',
          targetRowNumber: 2,
          targetColName: 'population',
        });
        expect(result).toEqual({
          ...dummy.result,
          counterValue: '18,604,000.000',
          counterValueTooltip: '18,604,000',
          targetValue: '24484000',
          targetValueTooltip: '24,484,000',
          showTrend: true,
          trendPositive: false,
        });

        const result2 = getCounterData(dummy.rows, {
          rowNumber: 2,
          counterColName: 'population',
          targetRowNumber: 1,
          targetColName: 'population',
        });
        expect(result2).toEqual({
          ...dummy.result,
          counterValue: '24,484,000.000',
          counterValueTooltip: '24,484,000',
          targetValue: '18604000',
          targetValueTooltip: '18,604,000',
          showTrend: true,
          trendPositive: true,
        });
      });
    });

    test('"Count Rows" option is enabled', () => {
      const result = getCounterData(dummy.rows, { countRow: true });

      expect(result).toEqual({
        ...dummy.result,
        counterValue: '3.000',
        counterValueTooltip: '3',
        showTrend: false,
      });
    });
  });
});
