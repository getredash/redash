import ChartRenderer from './chart/ChartRenderer';
import ChartEditor from './chart/ChartEditor';
import GridRenderer from './table/GridRenderer';
import GridEditor from './table/GridEditor';
import ChoroplethRenderer from './choropleth/ChoroplethRenderer';
import ChoroplethEditor from './choropleth/ChoroplethEditor';
import CohortRenderer from './cohort/CohortRenderer';
import CohortEditor from './cohort/CohortEditor';
import CounterRenderer from './counter/CounterRenderer';
import CounterEditor from './counter/CounterEditor';
import FunnelRenderer from './funnel/FunnelRenderer';
import FunnelEditor from './funnel/FunnelEditor';
import MapRenderer from './map/MapRenderer';
import MapEditor from './map/MapEditor';
import PivotRenderer from './pivot/PivotRenderer';
import PivotEditor from './pivot/PivotEditor';
import SankeyRenderer from './sankey/SankeyRenderer';
import SankeyEditor from './sankey/SankeyEditor';
import SunburstRenderer from './sunburst/SunburstRenderer';
import SunburstEditor from './sunburst/SunburstEditor';
import WordCloudRenderer from './word-cloud/WordCloudRenderer';
import WordCloudEditor from './word-cloud/WordCloudEditor';

const visualizationRegistry = {
  CHART: Object.freeze({
    name: 'Chart',
    renderer: ChartRenderer,
    editor: ChartEditor,
    defaultOptions: ChartRenderer.DEFAULT_OPTIONS,
  }),
  TABLE: Object.freeze({
    name: 'Table',
    renderer: GridRenderer,
    editor: GridEditor,
    defaultOptions: GridRenderer.DEFAULT_OPTIONS,
  }),
  CHOROPLETH: Object.freeze({
    name: 'Map (Choropleth)',
    renderer: ChoroplethRenderer,
    editor: ChoroplethEditor,
    defaultOptions: ChoroplethRenderer.DEFAULT_OPTIONS,
  }),
  COHORT: Object.freeze({
    name: 'Cohort',
    renderer: CohortRenderer,
    editor: CohortEditor,
    defaultOptions: CohortRenderer.DEFAULT_OPTIONS,
  }),
  COUNTER: Object.freeze({
    name: 'Counter',
    renderer: CounterRenderer,
    editor: CounterEditor,
    defaultOptions: CounterRenderer.DEFAULT_OPTIONS,
  }),
  FUNNEL: Object.freeze({
    name: 'Funnel',
    renderer: FunnelRenderer,
    editor: FunnelEditor,
    defaultOptions: FunnelRenderer.DEFAULT_OPTIONS,
  }),
  MAP: Object.freeze({
    name: 'Map (Markers)',
    renderer: MapRenderer,
    editor: MapEditor,
    defaultOptions: MapRenderer.DEFAULT_OPTIONS,
  }),
  PIVOT: Object.freeze({
    name: 'Pivot Table',
    renderer: PivotRenderer,
    editor: PivotEditor,
    defaultOptions: PivotRenderer.DEFAULT_OPTIONS,
  }),
  SANKEY: Object.freeze({
    name: 'Sankey',
    renderer: SankeyRenderer,
    editor: SankeyEditor,
    defaultOptions: SankeyRenderer.DEFAULT_OPTIONS,
  }),
  SUNBURST_SEQUENCE: Object.freeze({
    name: 'Sunburst Sequence',
    renderer: SunburstRenderer,
    editor: SunburstEditor,
    defaultOptions: SunburstRenderer.DEFAULT_OPTIONS,
  }),
  WORD_CLOUD: Object.freeze({
    name: 'Word Cloud',
    renderer: WordCloudRenderer,
    editor: WordCloudEditor,
    defaultOptions: WordCloudRenderer.DEFAULT_OPTIONS,
  }),
};
export default Object.freeze(visualizationRegistry);
