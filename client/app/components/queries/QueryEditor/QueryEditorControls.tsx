import { isFunction, map, filter, fromPairs, noop } from "lodash";
import React, { useEffect } from "react";
import PropTypes from "prop-types";
import Tooltip from "antd/lib/tooltip";
import Button from "antd/lib/button";
import Select from "antd/lib/select";
import KeyboardShortcuts, { humanReadableShortcut } from "@/services/KeyboardShortcuts";

import AutocompleteToggle from "./AutocompleteToggle";
import "./QueryEditorControls.less";
import AutoLimitCheckbox from "@/components/queries/QueryEditor/AutoLimitCheckbox";

type OwnButtonTooltipProps = {
    title?: React.ReactNode;
    shortcut?: string;
};

type ButtonTooltipProps = OwnButtonTooltipProps & typeof ButtonTooltip.defaultProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export function ButtonTooltip({ title, shortcut, ...props }: ButtonTooltipProps) {
  // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
  shortcut = humanReadableShortcut(shortcut, 1); // show only primary shortcut
  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
  title =
    title && shortcut ? (
      <React.Fragment>
        {title} (<i>{shortcut}</i>)
      </React.Fragment>
    ) : (
      title || shortcut
    );
  return <Tooltip placement="top" title={title} {...props} />;
}

ButtonTooltip.defaultProps = {
  title: null,
  shortcut: null,
};

type OwnEditorControlProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'ButtonPropsPropType' refers to a value, but is be... Remove this comment to see the full error message
    addParameterButtonProps?: ButtonPropsPropType;
    // @ts-expect-error ts-migrate(2749) FIXME: 'ButtonPropsPropType' refers to a value, but is be... Remove this comment to see the full error message
    formatButtonProps?: ButtonPropsPropType;
    // @ts-expect-error ts-migrate(2749) FIXME: 'ButtonPropsPropType' refers to a value, but is be... Remove this comment to see the full error message
    saveButtonProps?: ButtonPropsPropType;
    // @ts-expect-error ts-migrate(2749) FIXME: 'ButtonPropsPropType' refers to a value, but is be... Remove this comment to see the full error message
    executeButtonProps?: ButtonPropsPropType;
    autocompleteToggleProps?: boolean | {
        available?: boolean;
        enabled?: boolean;
        onToggle?: (...args: any[]) => any;
    };
    autoLimitCheckboxProps?: boolean | any; // TODO: PropTypes.shape(AutoLimitCheckbox.propTypes)
    dataSourceSelectorProps?: boolean | {
        disabled?: boolean;
        value?: string | number;
        options?: {
            value?: string | number;
            label?: React.ReactNode;
        }[];
        onChange?: (...args: any[]) => any;
    };
};

type EditorControlProps = OwnEditorControlProps & typeof EditorControl.defaultProps;

export default function EditorControl({ addParameterButtonProps, formatButtonProps, saveButtonProps, executeButtonProps, autocompleteToggleProps, autoLimitCheckboxProps, dataSourceSelectorProps, }: EditorControlProps) {
  useEffect(() => {
    const buttons = filter(
      [addParameterButtonProps, formatButtonProps, saveButtonProps, executeButtonProps],
      b => b.shortcut && isFunction(b.onClick)
    );
    if (buttons.length > 0) {
      const shortcuts = fromPairs(map(buttons, b => [b.shortcut, b.disabled ? noop : b.onClick]));
      KeyboardShortcuts.bind(shortcuts);
      return () => {
        KeyboardShortcuts.unbind(shortcuts);
      };
    }
  }, [addParameterButtonProps, formatButtonProps, saveButtonProps, executeButtonProps]);

  return (
    <div className="query-editor-controls">
      {addParameterButtonProps !== false && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ButtonTooltip title={addParameterButtonProps.title} shortcut={addParameterButtonProps.shortcut}>
          <Button
            className="query-editor-controls-button m-r-5"
            disabled={addParameterButtonProps.disabled}
            onClick={addParameterButtonProps.onClick}>
            {"{{"}&nbsp;{"}}"}
          </Button>
        </ButtonTooltip>
      )}
      {formatButtonProps !== false && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ButtonTooltip title={formatButtonProps.title} shortcut={formatButtonProps.shortcut}>
          <Button
            className="query-editor-controls-button m-r-5"
            disabled={formatButtonProps.disabled}
            onClick={formatButtonProps.onClick}>
            <span className="zmdi zmdi-format-indent-increase" />
            {formatButtonProps.text}
          </Button>
        </ButtonTooltip>
      )}
      {autocompleteToggleProps !== false && (
        <AutocompleteToggle
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'available' does not exist on type 'true ... Remove this comment to see the full error message
          available={autocompleteToggleProps.available}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'enabled' does not exist on type 'true | ... Remove this comment to see the full error message
          enabled={autocompleteToggleProps.enabled}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'onToggle' does not exist on type 'true |... Remove this comment to see the full error message
          onToggle={autocompleteToggleProps.onToggle}
        />
      )}
      {autoLimitCheckboxProps !== false && <AutoLimitCheckbox {...autoLimitCheckboxProps} />}
      {dataSourceSelectorProps === false && <span className="query-editor-controls-spacer" />}
      {dataSourceSelectorProps !== false && (
        <Select
          className="w-100 flex-fill datasource-small"
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'disabled' does not exist on type 'true |... Remove this comment to see the full error message
          disabled={dataSourceSelectorProps.disabled}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'value' does not exist on type 'true | ({... Remove this comment to see the full error message
          value={dataSourceSelectorProps.value}
          // @ts-expect-error ts-migrate(2339) FIXME: Property 'onChange' does not exist on type 'true |... Remove this comment to see the full error message
          onChange={dataSourceSelectorProps.onChange}>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'options' does not exist on type 'true | ... Remove this comment to see the full error message */}
          {map(dataSourceSelectorProps.options, option => (
            <Select.Option key={`option-${option.value}`} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      )}
      {saveButtonProps !== false && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ButtonTooltip title={saveButtonProps.title} shortcut={saveButtonProps.shortcut}>
          <Button
            className="query-editor-controls-button m-l-5"
            disabled={saveButtonProps.disabled}
            loading={saveButtonProps.loading}
            onClick={saveButtonProps.onClick}
            data-test="SaveButton">
            {!saveButtonProps.loading && <span className="fa fa-floppy-o" />}
            {saveButtonProps.text}
          </Button>
        </ButtonTooltip>
      )}
      {executeButtonProps !== false && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <ButtonTooltip title={executeButtonProps.title} shortcut={executeButtonProps.shortcut}>
          <Button
            className="query-editor-controls-button m-l-5"
            type="primary"
            disabled={executeButtonProps.disabled}
            onClick={executeButtonProps.onClick}
            data-test="ExecuteButton">
            <span className="zmdi zmdi-play" />
            {executeButtonProps.text}
          </Button>
        </ButtonTooltip>
      )}
    </div>
  );
}

// @ts-expect-error ts-migrate(6133) FIXME: 'ButtonPropsPropType' is declared but its value is... Remove this comment to see the full error message
const ButtonPropsPropType = PropTypes.oneOfType([
  PropTypes.bool, // `false` to hide button
  PropTypes.shape({
    title: PropTypes.node,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    onClick: PropTypes.func,
    text: PropTypes.node,
    shortcut: PropTypes.string,
  }),
]);

EditorControl.defaultProps = {
  addParameterButtonProps: false,
  formatButtonProps: false,
  saveButtonProps: false,
  executeButtonProps: false,
  autocompleteToggleProps: false,
  autoLimitCheckboxProps: false,
  dataSourceSelectorProps: false,
};
