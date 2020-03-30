import React from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Input, Checkbox, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function AppearanceSettings({ options, onOptionsChange }) {
  const [debouncedOnOptionsChange] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      <Section>
        <Input
          layout="horizontal"
          label="Time Column Title"
          defaultValue={options.timeColumnTitle}
          onChange={e => debouncedOnOptionsChange({ timeColumnTitle: e.target.value })}
        />
      </Section>
      <Section>
        <Input
          layout="horizontal"
          label="People Column Title"
          defaultValue={options.peopleColumnTitle}
          onChange={e => debouncedOnOptionsChange({ peopleColumnTitle: e.target.value })}
        />
      </Section>
      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Stage Column Title
              <ContextHelp placement="topRight" arrowPointAtCenter>
                <div>
                  Use <code>{"{{ @ }}"}</code> to insert a stage number
                </div>
              </ContextHelp>
            </React.Fragment>
          }
          defaultValue={options.stageColumnTitle}
          onChange={e => debouncedOnOptionsChange({ stageColumnTitle: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Number Values Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          defaultValue={options.numberFormat}
          onChange={e => debouncedOnOptionsChange({ numberFormat: e.target.value })}
        />
      </Section>
      <Section>
        <Input
          layout="horizontal"
          label={
            <React.Fragment>
              Percent Values Format
              <ContextHelp.NumberFormatSpecs />
            </React.Fragment>
          }
          defaultValue={options.percentFormat}
          onChange={e => debouncedOnOptionsChange({ percentFormat: e.target.value })}
        />
      </Section>

      <Section>
        <Input
          layout="horizontal"
          label="No Value Placeholder"
          defaultValue={options.noValuePlaceholder}
          onChange={e => debouncedOnOptionsChange({ noValuePlaceholder: e.target.value })}
        />
      </Section>

      <Section>
        <Checkbox
          defaultChecked={options.showTooltips}
          onChange={event => onOptionsChange({ showTooltips: event.target.checked })}>
          Show Tooltips
        </Checkbox>
      </Section>
      <Section>
        <Checkbox
          defaultChecked={options.percentValues}
          onChange={event => onOptionsChange({ percentValues: event.target.checked })}>
          Normalize Values to Percentage
        </Checkbox>
      </Section>
    </React.Fragment>
  );
}

AppearanceSettings.propTypes = EditorPropTypes;
