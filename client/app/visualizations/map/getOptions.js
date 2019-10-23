import { merge } from 'lodash';

const DEFAULT_OPTIONS = {
  latColName: 'lat',
  lonColName: 'lon',
  classify: null,
  groups: {},
  clusterMarkers: true,
  iconShape: 'marker',
  iconFont: 'circle',
  foregroundColor: '#ffffff',
  backgroundColor: '#356AFF',
  borderColor: '#356AFF',
};

export default function getOptions(options) {
  options = merge({}, DEFAULT_OPTIONS, options);

  // Backward compatibility
  if (options.classify === 'none') {
    options.classify = null;
  }

  return options;
}
