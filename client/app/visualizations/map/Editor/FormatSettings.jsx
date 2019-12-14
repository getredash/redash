import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, Checkbox, TextArea, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

function TemplateFormatHint() {
  // eslint-disable-line react/prop-types
  return (
    <ContextHelp placement="topLeft" arrowPointAtCenter>
      <div className="p-b-5">
        All query result columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
      </div>
      <div className="p-b-5">Leave this field empty to use default template.</div>
    </ContextHelp>
  );
}

export default function FormatSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  const templateFormatHint = <TemplateFormatHint />;

  return (
    <div className="map-visualization-editor-format-settings">
      <Section>
        <Checkbox
          data-test="Map.Editor.TooltipEnabled"
          checked={options.tooltip.enabled}
          onChange={event => onOptionsChange({ tooltip: { enabled: event.target.checked } })}>
          Show tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          label={<React.Fragment>Tooltip template {templateFormatHint}</React.Fragment>}
          className="w-100"
          data-test="Map.Editor.TooltipTemplate"
          disabled={!options.tooltip.enabled}
          placeholder="Default template"
          defaultValue={options.tooltip.template}
          onChange={event => onOptionsChangeDebounced({ tooltip: { template: event.target.value } })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Map.Editor.PopupEnabled"
          checked={options.popup.enabled}
          onChange={event => onOptionsChange({ popup: { enabled: event.target.checked } })}>
          Show popup
        </Checkbox>
      </Section>

      <Section>
        <TextArea
          label={<React.Fragment>Popup template {templateFormatHint}</React.Fragment>}
          className="w-100"
          data-test="Map.Editor.PopupTemplate"
          disabled={!options.popup.enabled}
          rows={4}
          placeholder="Default template"
          defaultValue={options.popup.template}
          onChange={event => onOptionsChangeDebounced({ popup: { template: event.target.value } })}
        />
      </Section>
    </div>
  );
}

FormatSettings.propTypes = EditorPropTypes;
