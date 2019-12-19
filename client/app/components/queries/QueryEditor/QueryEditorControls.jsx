import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Tooltip from "antd/lib/tooltip";
import Button from "antd/lib/button";
import Select from "antd/lib/select";

import AutocompleteToggle from "./AutocompleteToggle";
import "./QueryEditorControls.less";

export default function EditorControl({
  addParameterButtonProps,
  formatButtonProps,
  saveButtonProps,
  executeButtonProps,
  autocompleteToggleProps,
  dataSourceSelectorProps,
}) {
  return (
    <div className="query-editor-controls">
      {addParameterButtonProps !== false && (
        <Tooltip placement="top" title={addParameterButtonProps.title}>
          <Button
            className="query-editor-controls-button m-r-5"
            disabled={addParameterButtonProps.disabled}
            onClick={addParameterButtonProps.onClick}>
            {"{{"}&nbsp;{"}}"}
          </Button>
        </Tooltip>
      )}
      {formatButtonProps !== false && (
        <Tooltip placement="top" title={formatButtonProps.title}>
          <Button
            className="query-editor-controls-button m-r-5"
            disabled={formatButtonProps.disabled}
            onClick={formatButtonProps.onClick}>
            <span className="zmdi zmdi-format-indent-increase" />
            {formatButtonProps.text}
          </Button>
        </Tooltip>
      )}
      {autocompleteToggleProps !== false && (
        <AutocompleteToggle
          available={autocompleteToggleProps.available}
          enabled={autocompleteToggleProps.enabled}
          onToggle={autocompleteToggleProps.onToggle}
        />
      )}
      {dataSourceSelectorProps === false && <span className="flex-fill" />}
      {dataSourceSelectorProps !== false && (
        <Select
          className="w-100 flex-fill datasource-small"
          disabled={dataSourceSelectorProps.disabled}
          value={dataSourceSelectorProps.value}
          onChange={dataSourceSelectorProps.onChange}>
          {map(dataSourceSelectorProps.options, option => (
            <Select.Option key={`option-${option.value}`} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      )}
      {saveButtonProps !== false && (
        <Tooltip placement="top" title={saveButtonProps.title}>
          <Button
            className="query-editor-controls-button m-l-5"
            disabled={saveButtonProps.disabled}
            onClick={saveButtonProps.onClick}
            data-test="SaveButton">
            <span className="fa fa-floppy-o" />
            {saveButtonProps.text}
          </Button>
        </Tooltip>
      )}
      {executeButtonProps !== false && (
        <Tooltip placement="top" title={executeButtonProps.title}>
          <Button
            className="query-editor-controls-button m-l-5"
            type="primary"
            disabled={executeButtonProps.disabled}
            onClick={executeButtonProps.onClick}
            data-test="ExecuteButton">
            <span className="zmdi zmdi-play" />
            {executeButtonProps.text}
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

const ButtonPropsPropType = PropTypes.oneOfType([
  PropTypes.bool, // `false` to hide button
  PropTypes.shape({
    title: PropTypes.node,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
    text: PropTypes.node,
  }),
]);

EditorControl.propTypes = {
  addParameterButtonProps: ButtonPropsPropType,
  formatButtonProps: ButtonPropsPropType,
  saveButtonProps: ButtonPropsPropType,
  executeButtonProps: ButtonPropsPropType,
  autocompleteToggleProps: PropTypes.oneOfType([
    PropTypes.bool, // `false` to hide
    PropTypes.shape({
      available: PropTypes.bool,
      enabled: PropTypes.bool,
      onToggle: PropTypes.func,
    }),
  ]),
  dataSourceSelectorProps: PropTypes.oneOfType([
    PropTypes.bool, // `false` to hide
    PropTypes.shape({
      disabled: PropTypes.bool,
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      options: PropTypes.arrayOf(
        PropTypes.shape({
          value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
          label: PropTypes.node,
        })
      ),
      onChange: PropTypes.func,
    }),
  ]),
};

EditorControl.defaultProps = {
  addParameterButtonProps: false,
  formatButtonProps: false,
  saveButtonProps: false,
  executeButtonProps: false,
  autocompleteToggleProps: false,
  dataSourceSelectorProps: false,
};
