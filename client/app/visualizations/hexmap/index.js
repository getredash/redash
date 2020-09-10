import { registerVisualization } from '@/visualizations';

import Renderer from './Renderer';
import Editor from './Editor';

const DEFAULT_OPTIONS = {
  lonColName: 'lon',
  latColName: 'lat',
  radius: 2000,
  tooltipLabel: 'Hexagon Count',
  elevation: 0,
  maxCount: 500,
  setMapCenter: false,
  setMaxDomain: false,
  zoom: 7,
  centerLat: 28.54,
  centerLon: 77.25,
  bearing: 0,
  pitch: 0,
  isCenterSet: false,
};

export default function init() {
  registerVisualization({
    type: 'HEXMAP',
    name: 'Map (Hexagon)',
    getOptions: options => ({ ...DEFAULT_OPTIONS, ...options }),
    Renderer,
    Editor,

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
  });
}

init.init = true;
