import PropTypes from "prop-types";

export const SettingsEditorPropTypes = {
  settings: PropTypes.object,
  values: PropTypes.object,
  onChange: PropTypes.func, // (key, value) => void
  loading: PropTypes.bool,
};

export const SettingsEditorDefaultProps = {
  settings: {},
  values: {},
  onChange: () => {},
  loading: false,
};
