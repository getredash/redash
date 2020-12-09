import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, Checkbox, TextArea, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

function TemplateFormatHint() {
  // eslint-disable-line react/prop-types
  return (
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
    <ContextHelp placement="topLeft" arrowPointAtCenter>
      <div style={{ paddingBottom: 5 }}>
        All query result columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
      </div>
      <div style={{ paddingBottom: 5 }}>Leave this field empty to use default template.</div>
    </ContextHelp>
  );
}

export default function FormatSettings({
  options,
  onOptionsChange
}: any) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  const templateFormatHint = <TemplateFormatHint />;

  return (
    <div className="map-visualization-editor-format-settings">
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Map.Editor.TooltipEnabled"
          checked={options.tooltip.enabled}
          onChange={event => onOptionsChange({ tooltip: { enabled: event.target.checked } })}>
          Show tooltip
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={<React.Fragment>Tooltip template {templateFormatHint}</React.Fragment>}
          data-test="Map.Editor.TooltipTemplate"
          disabled={!options.tooltip.enabled}
          placeholder="Default template"
          defaultValue={options.tooltip.template}
          onChange={(event: any) => onOptionsChangeDebounced({ tooltip: { template: event.target.value } })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Map.Editor.PopupEnabled"
          checked={options.popup.enabled}
          onChange={event => onOptionsChange({ popup: { enabled: event.target.checked } })}>
          Show popup
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <TextArea
          label={<React.Fragment>Popup template {templateFormatHint}</React.Fragment>}
          data-test="Map.Editor.PopupTemplate"
          disabled={!options.popup.enabled}
          rows={4}
          placeholder="Default template"
          defaultValue={options.popup.template}
          onChange={(event: any) => onOptionsChangeDebounced({ popup: { template: event.target.value } })}
        />
      </Section>
    </div>
  );
}

FormatSettings.propTypes = EditorPropTypes;
