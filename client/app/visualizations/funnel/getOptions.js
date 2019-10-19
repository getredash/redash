import { merge } from 'lodash';

const DEFAULT_OPTIONS = {
  stepCol: { colName: '', displayAs: 'Steps' },
  valueCol: { colName: '', displayAs: 'Value' },
  sortKeyCol: { colName: '' },
  autoSort: true,
};

export default function getOptions(options) {
  return merge({}, DEFAULT_OPTIONS, options);
}
