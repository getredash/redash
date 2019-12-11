import React from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import {
  Section,
  Select,
  Input,
  Checkbox,
  TextArea,
  TextAlignmentSelect,
  ContextHelp,
} from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

function TemplateFormatHint({ mapType }) {
  // eslint-disable-line react/prop-types
  return (
    <ContextHelp placement="topLeft" arrowPointAtCenter>
      <div className="p-b-5">
        All query result columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
      </div>
      <div className="p-b-5">Use special names to access additional properties:</div>
      <div>
        <code>{"{{ @@value }}"}</code> formatted value;
      </div>
      {mapType === "countries" && (
        <React.Fragment>
          <div>
            <code>{"{{ @@name }}"}</code> short country name;
          </div>
          <div>
            <code>{"{{ @@name_long }}"}</code> full country name;
          </div>
          <div>
            <code>{"{{ @@abbrev }}"}</code> abbreviated country name;
          </div>
          <div>
            <code>{"{{ @@iso_a2 }}"}</code> two-letter ISO country code;
          </div>
          <div>
            <code>{"{{ @@iso_a3 }}"}</code> three-letter ISO country code;
          </div>
          <div>
            <code>{"{{ @@iso_n3 }}"}</code> three-digit ISO country code.
          </div>
        </React.Fragment>
      )}
      {mapType === "subdiv_japan" && (
        <React.Fragment>
          <div>
            <code>{"{{ @@name }}"}</code> Prefecture name in English;
          </div>
          <div>
            <code>{"{{ @@name_local }}"}</code> Prefecture name in Kanji;
          </div>
          <div>
            <code>{"{{ @@iso_3166_2 }}"}</code> five-letter ISO subdivision code (JP-xx);
          </div>
        </React.Fragment>
      )}
    </ContextHelp>
  );
}

export default function GeneralSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  const templateFormatHint = <TemplateFormatHint mapType={options.mapType} />;

  return (
    <div className="choropleth-visualization-editor-format-settings">
      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Input
              label={
                <React.Fragment>
                  Value format
                  <ContextHelp.NumberFormatSpecs />
                </React.Fragment>
              }
              className="w-100"
              data-test="Choropleth.Editor.ValueFormat"
              defaultValue={options.valueFormat}
              onChange={event => onOptionsChangeDebounced({ valueFormat: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Input
              label="Value placeholder"
              className="w-100"
              data-test="Choropleth.Editor.ValuePlaceholder"
              defaultValue={options.noValuePlaceholder}
              onChange={event => onOptionsChangeDebounced({ noValuePlaceholder: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Checkbox
          data-test="Choropleth.Editor.LegendVisibility"
          checked={options.legend.visible}
          onChange={event => onOptionsChange({ legend: { visible: event.target.checked } })}>
          Show legend
        </Checkbox>
      </Section>

      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Select
              label="Legend position"
              className="w-100"
              data-test="Choropleth.Editor.LegendPosition"
              disabled={!options.legend.visible}
              defaultValue={options.legend.position}
              onChange={position => onOptionsChange({ legend: { position } })}>
              <Select.Option value="top-left" data-test="Choropleth.Editor.LegendPosition.TopLeft">
                top / left
              </Select.Option>
              <Select.Option value="top-right" data-test="Choropleth.Editor.LegendPosition.TopRight">
                top / right
              </Select.Option>
              <Select.Option value="bottom-left" data-test="Choropleth.Editor.LegendPosition.BottomLeft">
                bottom / left
              </Select.Option>
              <Select.Option value="bottom-right" data-test="Choropleth.Editor.LegendPosition.BottomRight">
                bottom / right
              </Select.Option>
            </Select>
          </Grid.Col>
          <Grid.Col span={12}>
            <TextAlignmentSelect
              data-test="Choropleth.Editor.LegendTextAlignment"
              label="Legend text alignment"
              disabled={!options.legend.visible}
              defaultValue={options.legend.alignText}
              onChange={event => onOptionsChange({ legend: { alignText: event.target.value } })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Checkbox
          data-test="Choropleth.Editor.TooltipEnabled"
          checked={options.tooltip.enabled}
          onChange={event => onOptionsChange({ tooltip: { enabled: event.target.checked } })}>
          Show tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          label={<React.Fragment>Tooltip template {templateFormatHint}</React.Fragment>}
          className="w-100"
          data-test="Choropleth.Editor.TooltipTemplate"
          disabled={!options.tooltip.enabled}
          defaultValue={options.tooltip.template}
          onChange={event => onOptionsChangeDebounced({ tooltip: { template: event.target.value } })}
        />
      </Section>

      <Section>
        <Checkbox
          data-test="Choropleth.Editor.PopupEnabled"
          checked={options.popup.enabled}
          onChange={event => onOptionsChange({ popup: { enabled: event.target.checked } })}>
          Show popup
        </Checkbox>
      </Section>

      <Section>
        <TextArea
          label={<React.Fragment>Popup template {templateFormatHint}</React.Fragment>}
          className="w-100"
          data-test="Choropleth.Editor.PopupTemplate"
          disabled={!options.popup.enabled}
          rows={4}
          defaultValue={options.popup.template}
          onChange={event => onOptionsChangeDebounced({ popup: { template: event.target.value } })}
        />
      </Section>
    </div>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
