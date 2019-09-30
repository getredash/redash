import { map, keys } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import * as Grid from 'antd/lib/grid';
import Input from 'antd/lib/input';
import Radio from 'antd/lib/radio';
import Checkbox from 'antd/lib/checkbox';
import Select from 'antd/lib/select';
import Icon from 'antd/lib/icon';
import Tooltip from 'antd/lib/tooltip';

import ColumnTypes from '../columns';

export default function ColumnEditor({ column, onChange }) {
  function handleChange(changes) {
    onChange({ ...column, ...changes });
  }

  const AdditionalOptions = ColumnTypes[column.displayAs].Editor || null;

  return (
    <div className="table-visualization-editor-column">
      <Grid.Row gutter={15} type="flex" align="middle" className="m-b-15">
        <Grid.Col span={16}>
          <Input value={column.title} onChange={event => handleChange({ title: event.target.value })} />
        </Grid.Col>
        <Grid.Col span={8}>
          <Radio.Group
            className="table-visualization-editor-column-align-content"
            value={column.alignContent}
            onChange={event => handleChange({ alignContent: event.target.value })}
          >
            <Tooltip title="Align left" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="left"><Icon type="align-left" /></Radio.Button>
            </Tooltip>
            <Tooltip title="Align center" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="center"><Icon type="align-center" /></Radio.Button>
            </Tooltip>
            <Tooltip title="Align right" mouseEnterDelay={0} mouseLeaveDelay={0}>
              <Radio.Button value="right"><Icon type="align-right" /></Radio.Button>
            </Tooltip>
          </Radio.Group>
        </Grid.Col>
      </Grid.Row>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-allow-search`}>
          <Checkbox
            id={`table-column-editor-${column.name}-allow-search`}
            checked={column.allowSearch}
            onChange={event => handleChange({ allowSearch: event.target.checked })}
          />
          <span>Use for search</span>
        </label>
      </div>

      <div className="m-b-15">
        <label htmlFor={`table-column-editor-${column.name}-display-as`}>Display as:</label>
        <Select
          id={`table-column-editor-${column.name}-display-as`}
          className="w-100"
          value={column.displayAs}
          onChange={displayAs => handleChange({ displayAs })}
        >
          {map(ColumnTypes, ({ friendlyName }, key) => (
            <Select.Option key={key}>{friendlyName}</Select.Option>
          ))}
        </Select>
      </div>

      {AdditionalOptions && <AdditionalOptions column={column} onChange={handleChange} />}
    </div>
  );
}

ColumnEditor.propTypes = {
  column: PropTypes.shape({
    name: PropTypes.string.isRequired,
    title: PropTypes.string,
    visible: PropTypes.bool,
    alignContent: PropTypes.oneOf(['left', 'center', 'right']),
    displayAs: PropTypes.oneOf(keys(ColumnTypes)),
  }).isRequired,
  onChange: PropTypes.func,
};

ColumnEditor.defaultProps = {
  onChange: () => {},
};
