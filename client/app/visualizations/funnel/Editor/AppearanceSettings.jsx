import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import InputNumber from 'antd/lib/input-number';
import * as Grid from 'antd/lib/grid';
import ContextHelp from '@/components/visualizations/editor/ContextHelp';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

export default function AppearanceSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      <Section>
        <Grid.Row type="flex" align="middle">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-number-format">
              Number Values Format
              <ContextHelp.NumberFormatSpecs />
            </label>
          </Grid.Col>
          <Grid.Col span={12}>
            <Input
              id="funnel-editor-step-column-title"
              className="w-100"
              data-test="Funnel.NumberFormat"
              defaultValue={options.numberFormat}
              onChange={event => onOptionsChangeDebounced({ numberFormat: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Grid.Row type="flex" align="middle">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-number-format">
              Percent Values Format
              <ContextHelp.NumberFormatSpecs />
            </label>
          </Grid.Col>
          <Grid.Col span={12}>
            <Input
              id="funnel-editor-step-column-title"
              className="w-100"
              data-test="Funnel.PercentFormat"
              defaultValue={options.percentFormat}
              onChange={event => onOptionsChangeDebounced({ percentFormat: event.target.value })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Grid.Row type="flex" align="middle">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-items-limit">Items Count Limit</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <InputNumber
              id="funnel-editor-items-limit"
              className="w-100"
              data-test="Funnel.ItemsLimit"
              min={2}
              defaultValue={options.itemsLimit}
              onChange={itemsLimit => onOptionsChangeDebounced({ itemsLimit })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Grid.Row type="flex" align="middle">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-percent-values-range-min">Min Percent Value</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <InputNumber
              id="funnel-editor-percent-values-range-min"
              className="w-100"
              data-test="Funnel.PercentRangeMin"
              min={0}
              defaultValue={options.percentValuesRange.min}
              onChange={min => onOptionsChangeDebounced({ percentValuesRange: { min } })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>

      <Section>
        <Grid.Row type="flex" align="middle">
          <Grid.Col span={12}>
            <label htmlFor="funnel-editor-percent-values-range-max">Max Percent Value</label>
          </Grid.Col>
          <Grid.Col span={12}>
            <InputNumber
              id="funnel-editor-percent-values-range-max"
              className="w-100"
              data-test="Funnel.PercentRangeMax"
              min={0}
              defaultValue={options.percentValuesRange.max}
              onChange={max => onOptionsChangeDebounced({ percentValuesRange: { max } })}
            />
          </Grid.Col>
        </Grid.Row>
      </Section>
    </React.Fragment>
  );
}

AppearanceSettings.propTypes = EditorPropTypes;
