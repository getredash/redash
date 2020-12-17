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
        title && shortcut ? (<React.Fragment>
        {title} (<i>{shortcut}</i>)
      </React.Fragment>) : (title || shortcut);
    return <Tooltip placement="top" title={title} {...props}/>;
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
        const buttons = filter([addParameterButtonProps, formatButtonProps, saveButtonProps, executeButtonProps], b => b.shortcut && isFunction(b.onClick));
        if (buttons.length > 0) {
            const shortcuts = fromPairs(map(buttons, b => [b.shortcut, b.disabled ? noop : b.onClick]));
            KeyboardShortcuts.bind(shortcuts);
            return () => {
                KeyboardShortcuts.unbind(shortcuts);
            };
        }
    }, [addParameterButtonProps, formatButtonProps, saveButtonProps, executeButtonProps]);
    return (<div className="query-editor-controls">
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      {addParameterButtonProps !== false && (<ButtonTooltip title={addParameterButtonProps.title} shortcut={addParameterButtonProps.shortcut}>
          <Button className="query-editor-controls-button m-r-5" disabled={addParameterButtonProps.disabled} onClick={addParameterButtonProps.onClick}>
            {"{{"}&nbsp;{"}}"}
          </Button>
        </ButtonTooltip>)}
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      {formatButtonProps !== false && (<ButtonTooltip title={formatButtonProps.title} shortcut={formatButtonProps.shortcut}>
          <Button className="query-editor-controls-button m-r-5" disabled={formatButtonProps.disabled} onClick={formatButtonProps.onClick}>
            <span className="zmdi zmdi-format-indent-increase"/>
            {formatButtonProps.text}
          </Button>
        </ButtonTooltip>)}
      {autocompleteToggleProps !== false && (<AutocompleteToggle available={(autocompleteToggleProps as any).available} enabled={(autocompleteToggleProps as any).enabled} onToggle={(autocompleteToggleProps as any).onToggle}/>)}
      {autoLimitCheckboxProps !== false && <AutoLimitCheckbox {...autoLimitCheckboxProps}/>}
      {dataSourceSelectorProps === false && <span className="query-editor-controls-spacer"/>}
      {dataSourceSelectorProps !== false && (<Select className="w-100 flex-fill datasource-small" disabled={(dataSourceSelectorProps as any).disabled} value={(dataSourceSelectorProps as any).value} onChange={(dataSourceSelectorProps as any).onChange}>
          {map((dataSourceSelectorProps as any).options, option => (<Select.Option key={`option-${option.value}`} value={option.value}>
              {option.label}
            </Select.Option>))}
        </Select>)}
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      {saveButtonProps !== false && (<ButtonTooltip title={saveButtonProps.title} shortcut={saveButtonProps.shortcut}>
          <Button className="query-editor-controls-button m-l-5" disabled={saveButtonProps.disabled} loading={saveButtonProps.loading} onClick={saveButtonProps.onClick} data-test="SaveButton">
            {!saveButtonProps.loading && <span className="fa fa-floppy-o"/>}
            {saveButtonProps.text}
          </Button>
        </ButtonTooltip>)}
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      {executeButtonProps !== false && (<ButtonTooltip title={executeButtonProps.title} shortcut={executeButtonProps.shortcut}>
          <Button className="query-editor-controls-button m-l-5" type="primary" disabled={executeButtonProps.disabled} onClick={executeButtonProps.onClick} data-test="ExecuteButton">
            <span className="zmdi zmdi-play"/>
            {executeButtonProps.text}
          </Button>
        </ButtonTooltip>)}
    </div>);
}
// @ts-expect-error ts-migrate(6133) FIXME: 'ButtonPropsPropType' is declared but its value is... Remove this comment to see the full error message
const ButtonPropsPropType = PropTypes.oneOfType([
    PropTypes.bool,
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
