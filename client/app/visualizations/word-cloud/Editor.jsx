import { map, merge } from "lodash";
import React from "react";
import * as Grid from "antd/lib/grid";
import { Section, Select, InputNumber, ControlLabel } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function Editor({ options, data, onOptionsChange }) {
  const optionsChanged = newOptions => {
    onOptionsChange(merge({}, options, newOptions));
  };

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Words Column"
          data-test="WordCloud.WordsColumn"
          className="w-100"
          value={options.column}
          onChange={column => optionsChanged({ column })}>
          {map(data.columns, ({ name }) => (
            <Select.Option key={name} data-test={"WordCloud.WordsColumn." + name}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>
      <Section>
        <Select
          label="Frequencies Column"
          data-test="WordCloud.FrequenciesColumn"
          className="w-100"
          value={options.frequenciesColumn}
          onChange={frequenciesColumn => optionsChanged({ frequenciesColumn })}>
          <Select.Option key="none" value="">
            <i>(count word frequencies automatically)</i>
          </Select.Option>
          {map(data.columns, ({ name }) => (
            <Select.Option key={"column-" + name} value={name} data-test={"WordCloud.FrequenciesColumn." + name}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>
      <Section>
        <ControlLabel label="Words Length Limit">
          <Grid.Row gutter={15} type="flex">
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordLengthLimit.Min"
                className="w-100"
                placeholder="Min"
                min={0}
                value={options.wordLengthLimit.min}
                onChange={value => optionsChanged({ wordLengthLimit: { min: value > 0 ? value : null } })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordLengthLimit.Max"
                className="w-100"
                placeholder="Max"
                min={0}
                value={options.wordLengthLimit.max}
                onChange={value => optionsChanged({ wordLengthLimit: { max: value > 0 ? value : null } })}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
      <Section>
        <ControlLabel label="Frequencies Limit">
          <Grid.Row gutter={15} type="flex">
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordCountLimit.Min"
                className="w-100"
                placeholder="Min"
                min={0}
                value={options.wordCountLimit.min}
                onChange={value => optionsChanged({ wordCountLimit: { min: value > 0 ? value : null } })}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                data-test="WordCloud.WordCountLimit.Max"
                className="w-100"
                placeholder="Max"
                min={0}
                value={options.wordCountLimit.max}
                onChange={value => optionsChanged({ wordCountLimit: { max: value > 0 ? value : null } })}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
    </React.Fragment>
  );
}

Editor.propTypes = EditorPropTypes;
