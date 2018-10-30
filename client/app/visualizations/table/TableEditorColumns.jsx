import React from 'react';
import PropTypes from 'prop-types';
import { SortableContainer, SortableElement, arrayMove } from 'react-sortable-hoc';
import TableEditorColumnDetail from './TableEditorColumnDetail';

const SortableItem = SortableElement(TableEditorColumnDetail);

const SortableList = SortableContainer(({ items, columnUpdaters }) => (
  <div className="table-editor-query-columns m-t-10 m-b-10">
    {items.map((col, idx) => (
      <SortableItem
        key={col.name}
        column={col}
        index={idx}
        updateColumn={columnUpdaters[idx]}
      />))
    }
  </div>
));

export default class TableEditorColumns extends React.Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    updateColumns: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.columnUpdaters = [];
    for (let i = 0; i < props.columns.length; i += 1) {
      this.columnUpdaters[i] = (updates) => {
        const newCols = [];
        newCols[i] = Object.assign({}, this.props.columns[i], updates);
        return this.props.updateColumns(Object.assign([], this.props.columns, newCols));
      };
    }
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.updateColumns(arrayMove(this.props.columns, oldIndex, newIndex));
  };

  render() {
    return (
      <SortableList
        axis="x"
        distance={4}
        items={this.props.columns}
        onSortEnd={this.onSortEnd}
        helperClass="sortable-helper"
        columnUpdaters={this.columnUpdaters}
      />);
  }
}
