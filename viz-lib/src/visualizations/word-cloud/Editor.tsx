import { map, merge } from "lodash";
import React from "react";
import * as Grid from "antd/lib/grid";
import { Section, Select, InputNumber, ControlLabel } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

export default function Editor({
  options,
  data,
  onOptionsChange
}: any) {
  const optionsChanged = (newOptions: any) => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Words Column"
          data-test="WordCloud.WordsColumn"
          value={options.column}
          onChange={(column: any) => optionsChanged({ column })}>
          {map(data.columns, ({ name }) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={name} data-test={"WordCloud.WordsColumn." + name}>
              {name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        <Select
          label="Frequencies Column"
          data-test="WordCloud.FrequenciesColumn"
          value={options.frequenciesColumn}
          onChange={(frequenciesColumn: any) => optionsChanged({ frequenciesColumn })}>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          <Select.Option key="none" value="">
            <i>(count word frequencies automatically)</i>
          {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
          </Select.Option>
          {map(data.columns, ({ name }) => (
            // @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message
            <Select.Option key={"column-" + name} value={name} data-test={"WordCloud.FrequenciesColumn." + name}>
              {name}
            {/* @ts-expect-error ts-migrate(2339) FIXME: Property 'Option' does not exist on type '({ class... Remove this comment to see the full error message */}
            </Select.Option>
          ))}
        </Select>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
        <ControlLabel label="Words Length Limit">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <Grid.Row gutter={15} type="flex">
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordLengthLimit.Min"
                placeholder="Min"
                min={0}
                value={options.wordLengthLimit.min}
                onChange={(value: any) => optionsChanged({ wordLengthLimit: { min: value > 0 ? value : null } })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordLengthLimit.Max"
                placeholder="Max"
                min={0}
                value={options.wordLengthLimit.max}
                onChange={(value: any) => optionsChanged({ wordLengthLimit: { max: value > 0 ? value : null } })}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
        <ControlLabel label="Frequencies Limit">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <Grid.Row gutter={15} type="flex">
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordCountLimit.Min"
                placeholder="Min"
                min={0}
                value={options.wordCountLimit.min}
                onChange={(value: any) => optionsChanged({ wordCountLimit: { min: value > 0 ? value : null } })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordCountLimit.Max"
                placeholder="Max"
                min={0}
                value={options.wordCountLimit.max}
                onChange={(value: any) => optionsChanged({ wordCountLimit: { max: value > 0 ? value : null } })}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
