import PropTypes from 'prop-types';

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

export const RefreshScheduleType = PropTypes.shape({
  interval: PropTypes.number,
  time: PropTypes.string,
  day_of_week: PropTypes.string,
  until: PropTypes.string,
});

export const RefreshScheduleDefault = {
  interval: null,
  time: null,
  day_of_week: null,
  until: null,
};
