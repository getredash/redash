import { map } from 'lodash';
import { registerVisualization } from '@/visualizations';
import ColorPalette from '@/visualizations/ColorPalette';

import editorTemplate from './map-editor.html';

import getOptions from './getOptions';
import Renderer from './Renderer';
import Editor from './Editor';

const MAP_TILES = [
  {
    name: 'OpenStreetMap',
    url: '//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap BW',
    url: '//{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap DE',
    url: '//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap FR',
    url: '//{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenStreetMap Hot',
    url: '//{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
  },
  {
    name: 'Thunderforest',
    url: '//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png',
  },
  {
    name: 'Thunderforest Spinal',
    url: '//{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenMapSurfer',
    url: '//korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}',
  },
  {
    name: 'Stamen Toner',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png',
  },
  {
    name: 'Stamen Toner Background',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png',
  },
  {
    name: 'Stamen Toner Lite',
    url: '//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png',
  },
  {
    name: 'OpenTopoMap',
    url: '//{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  },
];

// TODO: Remove
export const MapEditor = {
  template: editorTemplate,
  bindings: {
    data: '<',
    options: '<',
    onOptionsChange: '<',
  },
  controller($scope) {
    this.currentTab = 'general';
    this.setCurrentTab = (tab) => {
      this.currentTab = tab;
    };

    this.mapTiles = MAP_TILES;

    this.iconShapes = {
      marker: 'Marker + Icon',
      doughnut: 'Circle',
      'circle-dot': 'Circle Dot',
      circle: 'Circle + Icon',
      'rectangle-dot': 'Square Dot',
      rectangle: 'Square + Icon',
    };

    this.colors = {
      White: '#ffffff',
      ...ColorPalette,
    };

    $scope.$watch('$ctrl.data.columns', () => {
      this.columns = this.data.columns;
      this.columnNames = map(this.columns, c => c.name);
      this.classifyColumns = [...this.columnNames, 'none'];
    });

    $scope.$watch('$ctrl.options', (options) => {
      this.onOptionsChange(options);
    }, true);
  },
};

export default function init() {
  registerVisualization({
    type: 'MAP',
    name: 'Map (Markers)',
    getOptions,
    Renderer,
    Editor,

    defaultColumns: 3,
    defaultRows: 8,
    minColumns: 2,
  });
}

init.init = true;
