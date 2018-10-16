import React from 'react';
import PropTypes from 'prop-types';
import { SortableContainer, SortableElement, arrayMove } from 'react-sortable-hoc';
import TableEditorColumnDetail from './TableEditorColumnDetail';

const SortableItem = SortableElement(TableEditorColumnDetail);

export default class TableEditorColumns extends React.Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    updateColumns: PropTypes.func.isRequired,
  }

  onSortEnd = ({ oldIndex, newIndex }) => {
    this.props.updateColumns(arrayMove(this.props.columns, oldIndex, newIndex));
  };

  render() {
    const columnUpdater = idx => (updates) => {
      const newCols = [];
      newCols[idx] = Object.assign({}, this.props.columns[idx], updates);
      return this.props.updateColumns(Object.assign([], this.props.columns, newCols));
    };
    const SortableList = SortableContainer(({ items }) => (
      <div className="table-editor-query-columns m-t-10 m-b-10">
        {items.map((col, idx) =>
          <SortableItem key={col.name} column={col} index={idx} updateColumn={columnUpdater(idx)} />)}
      </div>
    ));
    return <SortableList axis="x" distance={4} items={this.props.columns} onSortEnd={this.onSortEnd} helperClass="sortable-helper" />;
  }
}
