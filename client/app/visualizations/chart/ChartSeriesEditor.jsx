import React from 'react';
import PropTypes from 'prop-types';
import { SortableContainer, SortableElement, SortableHandle, arrayMove } from 'react-sortable-hoc';

import { SeriesOptions } from '@/components/proptypes';
import ChartTypePicker from './ChartTypePicker';

const DragHandle = SortableHandle(({ value, seriesOptions }) => <td style={{ width: '1%', cursor: 'move' }}><i className="fa fa-arrows-v" />{ seriesOptions[value].zIndex + 1 }</td>);

const SortableItem = SortableElement(({
  value,
  pie,
  changeYAxis,
  changeName,
  changeType,
  seriesOptions,
  clientConfig,
}) => (
  <tr>
    <DragHandle value={value} seriesOptions={seriesOptions} />
    {!pie ?
      <td>
        <input type="radio" checked={!seriesOptions[value].yAxis} onChange={e => changeYAxis(e, value, 0)} />
      </td> : null}
    {!pie ?
      <td>
        <input type="radio" checked={seriesOptions[value].yAxis} onChange={e => changeYAxis(e, value, 1)} />
      </td> : null }
    <td style={{ padding: 3, width: 140 }}>
      <input
        placeholder={value}
        className="form-control input-sm super-small-input"
        type="text"
        defaultValue={seriesOptions[value].name}
        onChange={e => changeName(value, e.target.value)}
      />
    </td>
    {!pie ?
      <td style={{ padding: 3, width: 105 }}>
        <ChartTypePicker
          value={seriesOptions[value].type}
          onChange={selected => changeType(value, selected)}
          clientConfig={clientConfig}
        />
      </td> : null }
  </tr>
));

const SortableRow = SortableContainer(({ items, ...props }) => (
  <tbody>
    {items.map((param, index) => (
      <SortableItem
        key={`item-${param}`}
        index={index}
        value={param}
        {...props}
      />))}
  </tbody>));


export default class ChartSeriesEditor extends React.Component {
  static propTypes = {
    seriesList: PropTypes.arrayOf(PropTypes.string).isRequired,
    seriesOptions: SeriesOptions.isRequired,
    type: PropTypes.string.isRequired,
    updateSeriesList: PropTypes.func.isRequired,
    updateSeriesOptions: PropTypes.func.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    clientConfig: PropTypes.object.isRequired,
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.updateSeriesList(arrayMove(this.props.seriesList, oldIndex, newIndex));
  };

  updateSeriesOptions = (k, v) => this.props.updateSeriesOptions({
    ...this.props.seriesOptions,
    [k]: Object.assign({}, this.props.seriesOptions[k], v),
  })

  changeYAxis = (e, target, yAxis) => {
    if (e.target.checked) {
      this.updateSeriesOptions(target, { yAxis });
    }
  }

  changeName = (value, name) => this.updateSeriesOptions(value, { name });
  changeType = (value, type) => this.updateSeriesOptions(value, { type });

  render() {
    const pie = this.props.type === 'pie';
    return (
      <div className="m-t-10 m-b-10">
        <table className="table table-condensed col-table">
          <thead>
            <tr>
              <th style={{ width: '1%' }}>zIndex</th>
              {!pie ? <th>Left Y Axis</th> : null }
              {!pie ? <th>Right Y Axis</th> : null }
              <th>Label</th>
              {!pie ? <th>Type</th> : null }
            </tr>
          </thead>
          <SortableRow
            useDragHandle
            items={this.props.seriesList}
            axis="y"
            onSortEnd={this.onSortEnd}
            helperClass="sortable-helper"
            pie={pie}
            changeYAxis={this.changeYAxis}
            changeType={this.changeType}
            changeName={this.changeName}
            clientConfig={this.props.clientConfig}
            seriesOptions={this.props.seriesOptions}
          />
        </table>
      </div>
    );
  }
}
