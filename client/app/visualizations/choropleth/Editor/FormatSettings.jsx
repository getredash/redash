import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Input from 'antd/lib/input';
import Checkbox from 'antd/lib/checkbox';
import Select from 'antd/lib/select';
import Radio from 'antd/lib/radio';
import Tooltip from 'antd/lib/tooltip';
import Popover from 'antd/lib/popover';
import Icon from 'antd/lib/icon';
import * as Grid from 'antd/lib/grid';
import { EditorPropTypes } from '@/visualizations';

function TemplateFormatHint({ mapType }) { // eslint-disable-line react/prop-types
  return (
    <Popover
      placement="topLeft"
      arrowPointAtCenter
      content={(
        <React.Fragment>
          <div className="p-b-5">All query result columns can be referenced using <code>{'{{ column_name }}'}</code> syntax.</div>
          <div className="p-b-5">Use special names to access additional properties:</div>
          <div><code>{'{{ @@value }}'}</code> formatted value;</div>
          {mapType === 'countries' && (
            <React.Fragment>
              <div><code>{'{{ @@name }}'}</code> short country name;</div>
              <div><code>{'{{ @@name_long }}'}</code> full country name;</div>
              <div><code>{'{{ @@abbrev }}'}</code> abbreviated country name;</div>
              <div><code>{'{{ @@iso_a2 }}'}</code> two-letter ISO country code;</div>
              <div><code>{'{{ @@iso_a3 }}'}</code> three-letter ISO country code;</div>
              <div><code>{'{{ @@iso_n3 }}'}</code> three-digit ISO country code.</div>
            </React.Fragment>
          )}
          {mapType === 'subdiv_japan' && (
            <React.Fragment>
              <div><code>{'{{ @@name }}'}</code> Prefecture name in English;</div>
              <div><code>{'{{ @@name_local }}'}</code> Prefecture name in Kanji;</div>
              <div><code>{'{{ @@iso_3166_2 }}'}</code> five-letter ISO subdivision code (JP-xx);</div>
            </React.Fragment>
          )}
        </React.Fragment>
      )}
    >
      <Icon className="m-l-5" type="question-circle" theme="filled" />
    </Popover>
  );
}

export default function GeneralSettings({ options, onOptionsChange }) {
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  const templateFormatHint = <TemplateFormatHint mapType={options.mapType} />;

  return (
    <div className="choropleth-visualization-editor-format-settings">
      <Grid.Row gutter={15} className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-value-format">
            Value format
            <Popover
              content={(
                <React.Fragment>
                  Format&nbsp;
                  <a href="https://redash.io/help/user-guide/visualizations/formatting-numbers" target="_blank" rel="noopener noreferrer">specs.</a>
                </React.Fragment>
              )}
            >
              <Icon className="m-l-5" type="question-circle" theme="filled" />
            </Popover>
          </label>
          <Input
            id="choropleth-editor-value-format"
            className="w-100"
            data-test="Choropleth.Editor.ValueFormat"
            defaultValue={options.valueFormat}
            onChange={event => onOptionsChangeDebounced({ valueFormat: event.target.value })}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-value-placeholder">Value placeholder</label>
          <Input
            id="choropleth-editor-value-placeholder"
            className="w-100"
            data-test="Choropleth.Editor.ValuePlaceholder"
            defaultValue={options.noValuePlaceholder}
            onChange={event => onOptionsChangeDebounced({ noValuePlaceholder: event.target.value })}
          />
        </Grid.Col>
      </Grid.Row>

      <div className="m-b-5">
        <label htmlFor="choropleth-editor-show-legend">
          <Checkbox
            id="choropleth-editor-show-legend"
            data-test="Choropleth.Editor.LegendVisibility"
            checked={options.legend.visible}
            onChange={event => onOptionsChange({ legend: { visible: event.target.checked } })}
          />
          <span>Show legend</span>
        </label>
      </div>

      <Grid.Row gutter={15} className="m-b-15">
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-legend-position">Legend position</label>
          <Select
            id="choropleth-editor-legend-position"
            className="w-100"
            data-test="Choropleth.Editor.LegendPosition"
            disabled={!options.legend.visible}
            defaultValue={options.legend.position}
            onChange={position => onOptionsChange({ legend: { position } })}
          >
            <Select.Option value="top-left" data-test="Choropleth.Editor.LegendPosition.TopLeft">top / left</Select.Option>
            <Select.Option value="top-right" data-test="Choropleth.Editor.LegendPosition.TopRight">top / right</Select.Option>
            <Select.Option value="bottom-left" data-test="Choropleth.Editor.LegendPosition.BottomLeft">bottom / left</Select.Option>
            <Select.Option value="bottom-right" data-test="Choropleth.Editor.LegendPosition.BottomRight">bottom / right</Select.Option>
          </Select>
        </Grid.Col>
        <Grid.Col span={12}>
          <label htmlFor="choropleth-editor-legend-text-alignment">Legend text alignment</label>
          <Radio.Group
            id="choropleth-editor-legend-text-alignment"
            className="choropleth-visualization-editor-legend-align-text"
            data-test="Choropleth.Editor.LegendTextAlignment"
            disabled={!options.legend.visible}
            defaultValue={options.legend.alignText}
            onChange={event => onOptionsChange({ legend: { alignText: event.target.value } })}
          >
            <Tooltip title="Align left" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="left" data-test="Choropleth.Editor.LegendTextAlignment.Left">
                <Icon type="align-left" />
              </Radio.Button>
            </Tooltip>
            <Tooltip title="Align center" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="center" data-test="Choropleth.Editor.LegendTextAlignment.Center">
                <Icon type="align-center" />
              </Radio.Button>
            </Tooltip>
            <Tooltip title="Align right" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="right" data-test="Choropleth.Editor.LegendTextAlignment.Right">
                <Icon type="align-right" />
              </Radio.Button>
            </Tooltip>
          </Radio.Group>
        </Grid.Col>
      </Grid.Row>

      <div className="m-b-5">
        <label htmlFor="choropleth-editor-show-tooltip">
          <Checkbox
            id="choropleth-editor-show-tooltip"
            data-test="Choropleth.Editor.TooltipEnabled"
            checked={options.tooltip.enabled}
            onChange={event => onOptionsChange({ tooltip: { enabled: event.target.checked } })}
          />
          <span>Show tooltip</span>
        </label>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-tooltip-template">Tooltip template {templateFormatHint}</label>
        <Input
          id="choropleth-editor-tooltip-template"
          className="w-100"
          data-test="Choropleth.Editor.TooltipTemplate"
          disabled={!options.tooltip.enabled}
          defaultValue={options.tooltip.template}
          onChange={event => onOptionsChangeDebounced({ tooltip: { template: event.target.value } })}
        />
      </div>

      <div className="m-b-5">
        <label htmlFor="choropleth-editor-show-popup">
          <Checkbox
            id="choropleth-editor-show-popup"
            data-test="Choropleth.Editor.PopupEnabled"
            checked={options.popup.enabled}
            onChange={event => onOptionsChange({ popup: { enabled: event.target.checked } })}
          />
          <span>Show popup</span>
        </label>
      </div>

      <div className="m-b-15">
        <label htmlFor="choropleth-editor-popup-template">Popup template {templateFormatHint}</label>
        <Input.TextArea
          id="choropleth-editor-popup-template"
          className="w-100"
          data-test="Choropleth.Editor.PopupTemplate"
          disabled={!options.popup.enabled}
          rows={4}
          defaultValue={options.popup.template}
          onChange={event => onOptionsChangeDebounced({ popup: { template: event.target.value } })}
        />
      </div>
    </div>
  );
}

GeneralSettings.propTypes = EditorPropTypes;
