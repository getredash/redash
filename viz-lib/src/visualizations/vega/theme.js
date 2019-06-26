/**
 * Vega Theme tweaked for Redash
 */
const markColor = '#1890e3';
const axisColor = '#767676';
const titleColor = '#333333';

// Borrowed from https://carto.com/carto-colors/
const CartoColors = {
  Prism: [
    '#5F4690',
    '#1D6996',
    '#38A6A5',
    '#0F8554',
    '#73AF48',
    '#EDAD08',
    '#E17C05',
    '#CC503E',
    '#94346E',
    '#6F4070',
    '#994E95',
    '#666666',
  ],
  Bold: [
    '#7F3C8D',
    '#11A579',
    '#3969AC',
    '#F2B701',
    '#E73F74',
    '#80BA5A',
    '#E68310',
    '#008695',
    '#CF1C90',
    '#f97b72',
    '#4b4b8f',
    '#A5AA99',
  ],
  Pastel: [
    '#66C5CC',
    '#F6CF71',
    '#F89C74',
    '#DCB0F2',
    '#87C55F',
    '#9EB9F3',
    '#FE88B1',
    '#C9DB74',
    '#8BE0A4',
    '#B497E7',
    '#D3B484',
    '#B3B3B3',
  ],
};

const redashThemeBase = {
  background: '#ffffff',

  group: {
    fill: '#e5e5e5',
  },
  arc: { fill: markColor, opacity: 0.9 },
  area: { fill: markColor, opacity: 0.9 },
  line: { stroke: markColor },
  path: { stroke: markColor },
  rect: { fill: markColor, opacity: 0.9 },
  shape: { stroke: markColor },
  symbol: { fill: markColor, size: 30 },
  fontSize: 13,

  axis: {
    domain: false,
    grid: true,
    gridWidth: 0.2,
    gridColor: axisColor,
    labelColor: axisColor,
    labelPadding: 5,
    labelFlushOffset: 4,
    labelFontSize: 11,
    tickColor: '#808080',
    tickWidth: 0.2,
    tickSize: 6,
    titleColor,
    titleFontSize: 14,
    titleFontWeight: 400,
    titlePadding: 8,
  },

  axisY: {
    tickSize: 0,
  },

  legend: {
    titleFontWeight: 400,
    titleFontSize: 14,
    labelFontSize: 13,
    labelFontWeight: 200,
    padding: 0,
    symbolSize: 36,
    symbolType: 'square',
  },

  view: {
    strokeWidth: 0,
  },

};
const redashThemes = {
  bold: { ...redashThemeBase, range: { category: CartoColors.Bold } },
  prism: { ...redashThemeBase, range: { category: CartoColors.Prism } },
  pastel: { ...redashThemeBase, range: { category: CartoColors.Pastel } },
};

export default redashThemes;
