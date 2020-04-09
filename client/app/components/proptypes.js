import PropTypes from "prop-types";
import { wrap } from "lodash";
import moment from "moment";

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
  type: PropTypes.oneOf([
    "ace",
    "text",
    "textarea",
    "email",
    "password",
    "number",
    "checkbox",
    "file",
    "select",
    "content",
  ]).isRequired,
  initialValue: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool,
    PropTypes.arrayOf(PropTypes.string),
    PropTypes.arrayOf(PropTypes.number),
  ]),
  content: PropTypes.node,
  mode: PropTypes.string,
  required: PropTypes.bool,
  extra: PropTypes.bool,
  readOnly: PropTypes.bool,
  autoFocus: PropTypes.bool,
  minLength: PropTypes.number,
  placeholder: PropTypes.string,
  contentAfter: PropTypes.oneOfType([PropTypes.node, PropTypes.func]),
  loading: PropTypes.bool,
  props: PropTypes.object, // eslint-disable-line react/forbid-prop-types
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

export const Destination = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
});

export const Query = PropTypes.shape({
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  data_source_id: PropTypes.number.isRequired,
  created_at: PropTypes.string.isRequired,
  updated_at: PropTypes.string,
  user: UserProfile,
  query: PropTypes.string,
  queryHash: PropTypes.string,
  is_safe: PropTypes.bool.isRequired,
  is_draft: PropTypes.bool.isRequired,
  is_archived: PropTypes.bool.isRequired,
  api_key: PropTypes.string.isRequired,
});

export const AlertOptions = PropTypes.shape({
  column: PropTypes.string,
  op: PropTypes.oneOf([">", ">=", "<", "<=", "==", "!="]),
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  custom_subject: PropTypes.string,
  custom_body: PropTypes.string,
});

export const Alert = PropTypes.shape({
  id: PropTypes.number,
  name: PropTypes.string,
  created_at: PropTypes.string,
  last_triggered_at: PropTypes.string,
  updated_at: PropTypes.string,
  rearm: PropTypes.number,
  state: PropTypes.oneOf(["ok", "triggered", "unknown"]),
  user: UserProfile,
  query: Query,
  options: PropTypes.shape({
    column: PropTypes.string,
    op: PropTypes.string,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }).isRequired,
});

function checkMoment(isRequired, props, propName, componentName) {
  const value = props[propName];
  const isRequiredValid = isRequired && value !== null && value !== undefined && moment.isMoment(value);
  const isOptionalValid = !isRequired && (value === null || value === undefined || moment.isMoment(value));
  if (!isRequiredValid && !isOptionalValid) {
    return new Error("Prop `" + propName + "` supplied to `" + componentName + "` should be a Moment.js instance.");
  }
}

export const Moment = wrap(false, checkMoment);
Moment.isRequired = wrap(true, checkMoment);
