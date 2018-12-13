import PropTypes from 'prop-types';

export const ClientConfig = PropTypes.shape({
  dateFormat: PropTypes.string,
  dateTimeFormat: PropTypes.string,
  integerFormat: PropTypes.string,
  floatFormat: PropTypes.string,
  booleanValues: PropTypes.arrayOf(PropTypes.string),
  version: PropTypes.string,
  newVersionAvailable: PropTypes.bool,
});

export const DataSource = PropTypes.shape({
  syntax: PropTypes.string,
  options: PropTypes.shape({
    doc: PropTypes.string,
    doc_url: PropTypes.string,
  }),
  type_name: PropTypes.string,
});

export const Table = PropTypes.shape({
  columns: PropTypes.arrayOf(PropTypes.string).isRequired,
});

export const Schema = PropTypes.arrayOf(Table);

export const QueryData = PropTypes.exact({
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  columns: PropTypes.arrayOf(PropTypes.shape({
    friendly_name: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  })),
});

export const SeriesOptions = PropTypes.objectOf(PropTypes.exact({
  yAxis: PropTypes.number.isRequired,
  zIndex: PropTypes.number.isRequired,
  index: PropTypes.number.isRequired,
  type: PropTypes.string.isRequired,
  name: PropTypes.string,
  color: PropTypes.string,
}));

export const ValuesOptions = PropTypes.objectOf(PropTypes.exact({ color: PropTypes.string.isRequired }));

export const Visualization = PropTypes.shape({
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  options: PropTypes.object.isRequired,
});

export const ColumnDetail = PropTypes.exact({
  alignContent: PropTypes.string.isRequired,
  allowHTML: PropTypes.bool.isRequired,
  allowSearch: PropTypes.bool.isRequired,
  booleanValues: PropTypes.arrayOf(PropTypes.string).isRequired,
  dateTimeFormat: PropTypes.string,
  displayAs: PropTypes.string.isRequired,
  formatFunction: PropTypes.func,
  friendly_name: PropTypes.string,
  highlightLinks: PropTypes.bool.isRequired,
  imageHeight: PropTypes.string.isRequired,
  imageTitleTemplate: PropTypes.string.isRequired,
  imageUrlTemplate: PropTypes.string.isRequired,
  imageWidth: PropTypes.string.isRequired,
  linkOpenInNewTab: PropTypes.bool.isRequired,
  linkTextTemplate: PropTypes.string.isRequired,
  linkTitleTemplate: PropTypes.string.isRequired,
  linkUrlTemplate: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  numberFormat: PropTypes.string,
  order: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  visible: PropTypes.bool.isRequired,
});

export const Row = PropTypes.object;
