import { isString, isObject, isFinite, isNumber, merge } from "lodash";
import React from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { Section, Select, Input, InputNumber, ContextHelp } from "@/components/visualizations/editor";

function toNumber(value: any) {
  value = isNumber(value) ? value : parseFloat(value);
  return isFinite(value) ? value : null;
}

type OwnProps = {
  id: string;
  options: {
    type: string;
    title?: {
      text?: string;
    };
    rangeMin?: number;
    rangeMax?: number;
    tickFormat?: string;
  };
  features?: {
    autoDetectType?: boolean;
    range?: boolean;
  };
  onChange?: (...args: any[]) => any;
};

type Props = OwnProps & typeof AxisSettings.defaultProps;

export default function AxisSettings({ id, options, features, onChange }: Props) {
  function optionsChanged(newOptions: any) {
    onChange(merge({}, options, newOptions));
  }

  const [handleNameChange] = useDebouncedCallback(text => {
    const title = isString(text) && text !== "" ? { text } : null;
    optionsChanged({ title });
  }, 200);

  const [handleMinMaxChange] = useDebouncedCallback(opts => optionsChanged(opts), 200);

  const [handleTickFormatChange] = useDebouncedCallback(opts => optionsChanged(opts), 200);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Scale"
          data-test={`Chart.${id}.Type`}
          defaultValue={options.type}
          onChange={(type: any) => optionsChanged({ type })}>
          {features.autoDetectType && (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option value="-" data-test={`Chart.${id}.Type.Auto`}>
              Auto Detect
              {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          )}
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="datetime" data-test={`Chart.${id}.Type.DateTime`}>
            Datetime
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="linear" data-test={`Chart.${id}.Type.Linear`}>
            Linear
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="logarithmic" data-test={`Chart.${id}.Type.Logarithmic`}>
            Logarithmic
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option value="category" data-test={`Chart.${id}.Type.Category`}>
            Category
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
        </Select>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label="Name"
          data-test={`Chart.${id}.Name`}
          defaultValue={isObject(options.title) ? options.title.text : null}
          onChange={(event: any) => handleNameChange(event.target.value)}
        />
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Input
          label={
            <React.Fragment>
              Tick Format
              <ContextHelp.TickFormatSpecs />
            </React.Fragment>
          }
          data-test={`Chart.${id}.TickFormat`}
          defaultValue={options.tickFormat}
          onChange={(event: any) => handleTickFormatChange({ tickFormat: event.target.value })}
        />
      </Section>

      {features.range && (
        // @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message
        <Section>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ children: Element[]; gutter: number; type:... Remove this comment to see the full error message */}
          <Grid.Row gutter={15} type="flex" align="middle">
            <Grid.Col span={12}>
              <InputNumber
                label="Min Value"
                placeholder="Auto"
                data-test={`Chart.${id}.RangeMin`}
                defaultValue={toNumber(options.rangeMin)}
                onChange={(value: any) => handleMinMaxChange({ rangeMin: toNumber(value) })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                label="Max Value"
                placeholder="Auto"
                data-test={`Chart.${id}.RangeMax`}
                defaultValue={toNumber(options.rangeMax)}
                onChange={(value: any) => handleMinMaxChange({ rangeMax: toNumber(value) })}
              />
            </Grid.Col>
          </Grid.Row>
        </Section>
      )}
    </React.Fragment>
  );
}

AxisSettings.defaultProps = {
  features: {},
  onChange: () => {},
};
