import { map } from "lodash";
import React, { useMemo } from "react";
import PropTypes from "prop-types";
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
import { EditorPropTypes } from "@/visualizations/prop-types";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import { getGeoJsonFields } from "./utils";

function TemplateFormatHint({ geoJsonProperties }) {
  return (
    <ContextHelp placement="topLeft" arrowPointAtCenter>
      <div style={{ paddingBottom: 5 }}>
        <div>
          All query result columns can be referenced using <code>{"{{ column_name }}"}</code> syntax.
        </div>
        <div>
          Use <code>{"{{ @@value }}"}</code> to access formatted value.
        </div>
      </div>
      {geoJsonProperties.length > 0 && (
        <React.Fragment>
          <div className="p-b-5">GeoJSON properties could be accessed by these names:</div>
          <div style={{ maxHeight: 300, overflow: "auto" }}>
            {map(geoJsonProperties, property => (
              <div key={property}>
                <code>{`{{ @@${property}}}`}</code>
              </div>
            ))}
          </div>
        </React.Fragment>
      )}
    </ContextHelp>
  );
}

TemplateFormatHint.propTypes = {
  geoJsonProperties: PropTypes.arrayOf(PropTypes.string),
};

TemplateFormatHint.defaultProps = {
  geoJsonProperties: [],
};

export default function GeneralSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);
  const [geoJson] = useLoadGeoJson(options.mapType);
  const geoJsonFields = useMemo(() => getGeoJsonFields(geoJson), [geoJson]);

  const templateFormatHint = <TemplateFormatHint geoJsonProperties={geoJsonFields} />;

  return (
    <div className="choropleth-visualization-editor-format-settings">
      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Input
              label={
                <React.Fragment>
                  Value Format
                  <ContextHelp.NumberFormatSpecs />
                </React.Fragment>
              }
              data-test="Choropleth.Editor.ValueFormat"
              defaultValue={options.valueFormat}
              onChange={event => onOptionsChangeDebounced({ valueFormat: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Input
              label="Value Placeholder"
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
          Show Legend
        </Checkbox>
      </Section>

      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Select
              label="Legend Position"
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
              label="Legend Text Alignment"
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
          Show Tooltip
        </Checkbox>
      </Section>

      <Section>
        <Input
          label={<React.Fragment>Tooltip Template {templateFormatHint}</React.Fragment>}
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
          Show Popup
        </Checkbox>
      </Section>

      <Section>
        <TextArea
          label={<React.Fragment>Popup Template {templateFormatHint}</React.Fragment>}
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
