import { registerVisualization } from '@/visualizations';

import Renderer from './Renderer';
import Editor from './Editor';

const DEFAULT_OPTIONS = {
  lonColName: 'lon',
  latColName: 'lat',
  tooltipLabel: 'Hexagon Count',
  maxCount: 500,
  setMaxDomain: false,
  setMapCenter: false,
  setWeightColumn: false,
  zoom: 3,
  centerLat: 28.54,
  centerLon: 77.25,
  bearing: 0,
  pitch: 0,
  isCenterSet: false,
  layers: [],
};

export default function init() {
  registerVisualization({
    type: 'LAYERMAP',
    name: 'Map (Layered)',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
  });
}

init.init = true;
