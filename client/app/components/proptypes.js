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

export const Field = PropTypes.shape({
  name: PropTypes.string.isRequired,
  title: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'checkbox', 'file']).isRequired,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  required: PropTypes.bool,
  placeholder: PropTypes.string,
});

export const Action = PropTypes.shape({
  name: PropTypes.string.isRequired,
  callback: PropTypes.func.isRequired,
  type: PropTypes.string,
  pullRight: PropTypes.bool,
  disabledWhenDirty: PropTypes.bool,
});

export const AntdForm = PropTypes.shape({
  validateFieldsAndScroll: PropTypes.func,
});
