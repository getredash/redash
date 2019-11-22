import { includes } from 'lodash';
import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Checkbox from 'antd/lib/checkbox';
import Input from 'antd/lib/input';
import ContextHelp from '@/components/visualizations/editor/ContextHelp';
import Section from '@/components/visualizations/editor/Section';
import { EditorPropTypes } from '@/visualizations';

export default function DataLabelsSettings({ options, onOptionsChange }) {
  const isShowDataLabelsAvailable = includes(
    ['line', 'area', 'column', 'scatter', 'pie', 'heatmap'],
    options.globalSeriesType,
  );

  const [debouncedOnOptionsChange] = useDebouncedCallback(onOptionsChange, 200);

  return (
    <React.Fragment>
      { isShowDataLabelsAvailable && (
        <Section>
          <Checkbox
            data-test="Chart.DataLabels.ShowDataLabels"
            defaultChecked={options.showDataLabels}
            onChange={event => onOptionsChange({ showDataLabels: event.target.checked })}
          >
            Show Data Labels
          </Checkbox>
        </Section>
      )}

      <Section>
        <label htmlFor="chart-editor-number-format">
          Number Values Format
          <ContextHelp.NumberFormatSpecs />
        </label>
        <Input
          id="chart-editor-number-format"
          data-test="Chart.DataLabels.NumberFormat"
          defaultValue={options.numberFormat}
          onChange={e => debouncedOnOptionsChange({ numberFormat: e.target.value })}
        />
      </Section>

      <Section>
        <label htmlFor="chart-editor-percent-format">
          Percent Values Format
          <ContextHelp.NumberFormatSpecs />
        </label>
        <Input
          id="chart-editor-percent-format"
          data-test="Chart.DataLabels.PercentFormat"
          defaultValue={options.percentFormat}
          onChange={e => debouncedOnOptionsChange({ percentFormat: e.target.value })}
        />
      </Section>

      <Section>
        <label htmlFor="chart-editor-datetime-format">
          Date/Time Values Format
          <ContextHelp.DateTimeFormatSpecs />
        </label>
        <Input
          id="chart-editor-datetime-format"
          data-test="Chart.DataLabels.DateTimeFormat"
          defaultValue={options.dateTimeFormat}
          onChange={e => debouncedOnOptionsChange({ dateTimeFormat: e.target.value })}
        />
      </Section>

      <Section>
        <label htmlFor="chart-editor-text-format">
          Data Labels
          <ContextHelp placement="topRight" arrowPointAtCenter>
            <div className="p-b-5">Use special names to access additional properties:</div>
            <div><code>{'{{ @@name }}'}</code> series name;</div>
            <div><code>{'{{ @@x }}'}</code> x-value;</div>
            <div><code>{'{{ @@y }}'}</code> y-value;</div>
            <div><code>{'{{ @@yPercent }}'}</code> relative y-value;</div>
            <div><code>{'{{ @@yError }}'}</code> y deviation;</div>
            <div><code>{'{{ @@size }}'}</code> bubble size;</div>
            <div className="p-t-5">
              Also, all query result columns can be referenced<br />using
              <code className="text-nowrap">{'{{ column_name }}'}</code> syntax.
            </div>
          </ContextHelp>
        </label>
        <Input
          id="chart-editor-text-format"
          data-test="Chart.DataLabels.TextFormat"
          placeholder="(auto)"
          defaultValue={options.textFormat}
          onChange={e => debouncedOnOptionsChange({ textFormat: e.target.value })}
        />
      </Section>
    </React.Fragment>
  );
}

DataLabelsSettings.propTypes = EditorPropTypes;
