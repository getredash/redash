import { map } from "lodash";
import React, { useMemo } from "react";
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

type OwnTemplateFormatHintProps = {
    geoJsonProperties?: string[];
};

type TemplateFormatHintProps = OwnTemplateFormatHintProps & typeof TemplateFormatHint.defaultProps;

function TemplateFormatHint({ geoJsonProperties }: TemplateFormatHintProps) {
  return (
    // @ts-expect-error ts-migrate(2746) FIXME: This JSX tag's 'children' prop expects a single ch... Remove this comment to see the full error message
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

TemplateFormatHint.defaultProps = {
  geoJsonProperties: [],
};

export default function GeneralSettings({
  options,
  onOptionsChange
}: any) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);
  const [geoJson] = useLoadGeoJson(options.mapType);
  const geoJsonFields = useMemo(() => getGeoJsonFields(geoJson), [geoJson]);

  const templateFormatHint = <TemplateFormatHint geoJsonProperties={geoJsonFields} />;

  return (
    <div className="choropleth-visualization-editor-format-settings">
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
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
              onChange={(event: any) => onOptionsChangeDebounced({ valueFormat: event.target.value })}
            />
          </Grid.Col>
          <Grid.Col span={12}>
            <Input
              label="Value Placeholder"
              data-test="Choropleth.Editor.ValuePlaceholder"
              defaultValue={options.noValuePlaceholder}
              onChange={(event: any) => onOptionsChangeDebounced({ noValuePlaceholder: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Choropleth.Editor.LegendVisibility"
          checked={options.legend.visible}
          onChange={event => onOptionsChange({ legend: { visible: event.target.checked } })}>
          Show Legend
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Grid.Row gutter={15}>
          <Grid.Col span={12}>
            <Select
              label="Legend Position"
              data-test="Choropleth.Editor.LegendPosition"
              disabled={!options.legend.visible}
              defaultValue={options.legend.position}
              onChange={(position: any) => onOptionsChange({ legend: { position } })}>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="top-left" data-test="Choropleth.Editor.LegendPosition.TopLeft">
                top / left
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="top-right" data-test="Choropleth.Editor.LegendPosition.TopRight">
                top / right
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="bottom-left" data-test="Choropleth.Editor.LegendPosition.BottomLeft">
                bottom / left
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              <Select.Option value="bottom-right" data-test="Choropleth.Editor.LegendPosition.BottomRight">
                bottom / right
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
              </Select.Option>
            </Select>
          </Grid.Col>
          <Grid.Col span={12}>
            <TextAlignmentSelect
              data-test="Choropleth.Editor.LegendTextAlignment"
              label="Legend Text Alignment"
              disabled={!options.legend.visible}
              defaultValue={options.legend.alignText}
              onChange={(event: any) => onOptionsChange({ legend: { alignText: event.target.value } })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Choropleth.Editor.TooltipEnabled"
          checked={options.tooltip.enabled}
          onChange={event => onOptionsChange({ tooltip: { enabled: event.target.checked } })}>
          Show Tooltip
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={<React.Fragment>Tooltip Template {templateFormatHint}</React.Fragment>}
          data-test="Choropleth.Editor.TooltipTemplate"
          disabled={!options.tooltip.enabled}
          defaultValue={options.tooltip.template}
          onChange={(event: any) => onOptionsChangeDebounced({ tooltip: { template: event.target.value } })}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Checkbox
          data-test="Choropleth.Editor.PopupEnabled"
          checked={options.popup.enabled}
          onChange={event => onOptionsChange({ popup: { enabled: event.target.checked } })}>
          Show Popup
        </Checkbox>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <TextArea
          label={<React.Fragment>Popup Template {templateFormatHint}</React.Fragment>}
          data-test="Choropleth.Editor.PopupTemplate"
          disabled={!options.popup.enabled}
          rows={4}
          defaultValue={options.popup.template}
          onChange={(event: any) => onOptionsChangeDebounced({ popup: { template: event.target.value } })}
        />
      </Section>
    </div>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
