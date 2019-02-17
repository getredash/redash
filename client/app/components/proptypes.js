import PropTypes from 'prop-types';
import { wrap } from 'lodash';
import moment from 'moment';

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

export const Field = PropTypes.shape({
  name: PropTypes.string.isRequired,
  title: PropTypes.string,
  type: PropTypes.oneOf(['text', 'email', 'password', 'number', 'checkbox', 'file']).isRequired,
  initialValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  required: PropTypes.bool,
  readOnly: PropTypes.bool,
  minLength: PropTypes.number,
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

export const UserProfile = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  profileImageUrl: PropTypes.string,
  apiKey: PropTypes.string,
  isDisabled: PropTypes.bool,
});

function checkMoment(isRequired, props, propName, componentName) {
  const value = props[propName];
  const isRequiredValid = isRequired && (value !== null);
  const isOptionalValid = !isRequired && ((value === null) || moment.isMoment(value));
  if (!isRequiredValid && !isOptionalValid) {
    return new Error('Prop `' + propName + '` supplied to `' + componentName + '` should be a Moment.js instance.');
  }
}

export const Moment = wrap(false, checkMoment);
Moment.isRequired = wrap(true, checkMoment);
