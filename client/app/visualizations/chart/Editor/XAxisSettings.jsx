import { isString, isObject } from 'lodash';
import React from 'react';
import Switch from 'antd/lib/switch';
import Input from 'antd/lib/input';
import Select from 'antd/lib/select';
import { EditorPropTypes } from '@/visualizations';

export default function XAxisSettings({ options, onOptionsChange }) {
  function handleNameChange(event) {
    const text = event.target.value;
    if (isString(text) && (text !== '')) {
      onOptionsChange({ xAxis: { title: { text } } });
    } else {
      onOptionsChange({ xAxis: { title: null } });
    }
  }

  return (
    <React.Fragment>
      <div className="m-b-15">
        <label htmlFor="chart-editor-x-axis-type">Scale</label>
        <Select
          id="chart-editor-x-axis-type"
          className="w-100"
          data-test="Chart.XAxis.Type"
          defaultValue={options.xAxis.type}
          onChange={type => onOptionsChange({ xAxis: { type } })}
        >
          <Select.Option value="-">Auto Detect</Select.Option>
          <Select.Option value="datetime">Datetime</Select.Option>
          <Select.Option value="linear">Linear</Select.Option>
          <Select.Option value="logarithmic">Logarithmic</Select.Option>
          <Select.Option value="category">Category</Select.Option>
        </Select>
      </div>

      <div className="m-b-15">
        <label htmlFor="chart-editor-x-axis-name">Name</label>
        <Input
          id="chart-editor-x-axis-name"
          data-test="Chart.XAxis.Name"
          defaultValue={isObject(options.xAxis.title) ? options.xAxis.title.text : null}
          onChange={handleNameChange}
        />
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-sort">
          <Switch
            id="chart-editor-x-axis-sort"
            data-test="Chart.XAxis.Sort"
            defaultChecked={options.sortX}
            onChange={sortX => onOptionsChange({ sortX })}
          />
          <span className="m-l-10">Sort Values</span>
        </label>
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-reverse">
          <Switch
            id="chart-editor-x-axis-reverse"
            data-test="Chart.XAxis.Reverse"
            defaultChecked={options.reverseX}
            onChange={reverseX => onOptionsChange({ reverseX })}
          />
          <span className="m-l-10">Reverse Order</span>
        </label>
      </div>

      <div className="m-b-15">
        <label className="d-flex align-items-center" htmlFor="chart-editor-x-axis-show-labels">
          <Switch
            id="chart-editor-x-axis-show-labels"
            data-test="Chart.XAxis.ShowLabels"
            defaultChecked={options.xAxis.labels.enabled}
            onChange={enabled => onOptionsChange({ xAxis: { labels: { enabled } } })}
          />
          <span className="m-l-10">Show Labels</span>
        </label>
      </div>
    </React.Fragment>
  );
}

XAxisSettings.propTypes = EditorPropTypes;
