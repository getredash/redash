import { includes, map, extend, fromPairs } from 'lodash';
import React, { useMemo, useRef, useState, useContext, useCallback } from 'react';
import Table from 'antd/lib/table';
import Input from 'antd/lib/input';
import Radio from 'antd/lib/radio';
import Icon from 'antd/lib/icon';
import { sortableContainer, sortableElement, sortableHandle } from 'react-sortable-hoc';
import { EditorPropTypes } from '@/visualizations';
import ChartTypeSelect from './ChartTypeSelect';
import getChartData from '../getChartData';

const SortableEventsContext = React.createContext({
  onSortStart: () => {},
  onSortEnd: () => {},
});

const DragHandle = sortableHandle(({ children }) => children);

const SortableBodyRow = sortableElement(props => <tr {...props} />);

const SortableBody = (props) => {
  const SortableContainer = useMemo(() => sortableContainer(({ children }) => children), []);
  const containerRef = useRef(null);

  const sortableEvents = useContext(SortableEventsContext);

  return (
    <SortableContainer
      axis="y"
      lockAxis="y"
      lockToContainerEdges
      useDragHandle
      helperClass="chart-editor-series-dragged"
      helperContainer={() => containerRef.current}
      {...sortableEvents}
    >
      <tbody ref={containerRef} {...props} />
    </SortableContainer>
  );
};

function getTableColumns(options, updateSeriesOption) {
  const result = [
    {
      title: 'Order',
      dataIndex: 'zIndex',
      render: (unused, item) => (
        <DragHandle>
          <span className="chart-editor-series-drag-handle text-nowrap">
            <Icon type="swap" rotate={90} />
            <span className="m-l-5">{item.zIndex + 1}</span>
          </span>
        </DragHandle>
      ),
    },
    {
      title: 'Label',
      dataIndex: 'name',
      render: (unused, item) => (
        <Input
          placeholder={item.key}
          value={item.name}
          onChange={event => updateSeriesOption(item.key, 'name', event.target.value)}
        />
      ),
    },
  ];

  if (!includes(['pie', 'heatmap'], options.globalSeriesType)) {
    result.push({
      title: 'Y Axis',
      dataIndex: 'yAxis',
      render: (unused, item) => (
        <Radio.Group
          className="text-nowrap"
          value={item.yAxis === 1 ? 1 : 0}
          onChange={event => updateSeriesOption(item.key, 'yAxis', event.target.value)}
        >
          <Radio value={0}>left</Radio>
          <Radio value={1}>right</Radio>
        </Radio.Group>
      ),
    });
    result.push({
      title: 'Type',
      dataIndex: 'type',
      render: (unused, item) => (
        <ChartTypeSelect
          className="w-100"
          dropdownMatchSelectWidth={false}
          value={item.type}
          onChange={value => updateSeriesOption(item.key, 'type', value)}
        />
      ),
    });
  }

  return result;
}

export default function SeriesSettings({ options, data, onOptionsChange }) {
  const series = useMemo(() => map(
    getChartData(data.rows, options), // returns sorted series
    ({ name }, zIndex) => extend({ key: name }, options.seriesOptions[name], { zIndex }),
  ), [options, data]);

  const [isSorting, setIsSorting] = useState(false);

  const sortableEvents = useMemo(() => ({
    onSortStart: () => setIsSorting(true),
    onSortEnd: ({ oldIndex, newIndex }) => {
      setIsSorting(false);
      const seriesOptions = [...series];
      seriesOptions.splice(newIndex, 0, ...seriesOptions.splice(oldIndex, 1));
      onOptionsChange({ seriesOptions: fromPairs(map(seriesOptions, ({ key }, zIndex) => ([key, { zIndex }]))) });
    },
  }), [series]);

  const updateSeriesOption = useCallback((key, prop, value) => {
    onOptionsChange({
      seriesOptions: {
        [key]: {
          [prop]: value,
        },
      },
    });
  }, [onOptionsChange]);

  const columns = useMemo(
    () => getTableColumns(options, updateSeriesOption),
    [options, updateSeriesOption],
  );

  return (
    <SortableEventsContext.Provider value={sortableEvents}>
      <Table
        className={isSorting ? 'chart-editor-series-in-sorting' : null}
        dataSource={series}
        columns={columns}
        components={{
          body: {
            wrapper: SortableBody,
            row: SortableBodyRow,
          },
        }}
        onRow={item => ({
          index: item.zIndex,
        })}
        pagination={false}
      />
    </SortableEventsContext.Provider>
  );
}

SeriesSettings.propTypes = EditorPropTypes;
