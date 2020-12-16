import { includes, map, extend, fromPairs } from "lodash";
import React, { useMemo, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
import Radio from "antd/lib/radio";
// @ts-expect-error ts-migrate(2724) FIXME: Module '"../../../../node_modules/react-sortable-h... Remove this comment to see the full error message
import { sortableElement } from "react-sortable-hoc";
import { SortableContainer, DragHandle } from "@/components/sortable";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ChartTypeSelect from "./ChartTypeSelect";
import getChartData from "../getChartData";

const SortableBodyRow = sortableElement((props: any) => <tr {...props} />);

function getTableColumns(options: any, updateSeriesOption: any, debouncedUpdateSeriesOption: any) {
  const result = [
    {
      title: "Order",
      dataIndex: "zIndex",
      render: (unused: any, item: any) => (
        <span className="series-settings-order">
          <DragHandle />
          {item.zIndex + 1}
        </span>
      ),
    },
    {
      title: "Label",
      dataIndex: "name",
      render: (unused: any, item: any) => (
        <Input
          data-test={`Chart.Series.${item.key}.Label`}
          placeholder={item.key}
          defaultValue={item.name}
          onChange={event => debouncedUpdateSeriesOption(item.key, "name", event.target.value)}
        />
      ),
    },
  ];

  if (!includes(["pie", "heatmap"], options.globalSeriesType)) {
    if (!options.swappedAxes) {
      result.push({
        title: "Y Axis",
        dataIndex: "yAxis",
        render: (unused, item) => (
          <Radio.Group
            className="series-settings-y-axis"
            value={item.yAxis === 1 ? 1 : 0}
            onChange={event => updateSeriesOption(item.key, "yAxis", event.target.value)}>
            <Radio value={0} data-test={`Chart.Series.${item.key}.UseLeftAxis`}>
              left
            </Radio>
            <Radio value={1} data-test={`Chart.Series.${item.key}.UseRightAxis`}>
              right
            </Radio>
          </Radio.Group>
        ),
      });
    }

    result.push({
      title: "Type",
      dataIndex: "type",
      render: (unused, item) => (
        <ChartTypeSelect
          data-test={`Chart.Series.${item.key}.Type`}
          dropdownMatchSelectWidth={false}
          value={item.type}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          hiddenChartTypes={["pie", "heatmap", "bubble", "box"]}
          onChange={(value: any) => updateSeriesOption(item.key, "type", value)}
        />
      ),
    });
  }

  return result;
}

export default function SeriesSettings({
  options,
  data,
  onOptionsChange
}: any) {
  const series = useMemo(
    () =>
      map(
        getChartData(data.rows, options), // returns sorted series
        ({ name }, zIndex) =>
          extend({ key: name, type: options.globalSeriesType }, options.seriesOptions[name], { zIndex })
      ),
    [options, data]
  );

  const handleSortEnd = useCallback(
    ({ oldIndex, newIndex }) => {
      const seriesOptions = [...series];
      seriesOptions.splice(newIndex, 0, ...seriesOptions.splice(oldIndex, 1));
      // @ts-expect-error ts-migrate(2339) FIXME: Property 'key' does not exist on type 'Boolean'.
      onOptionsChange({ seriesOptions: fromPairs(map(seriesOptions, ({ key }, zIndex) => [key, { zIndex }])) });
    },
    [onOptionsChange, series]
  );

  const updateSeriesOption = useCallback(
    (key, prop, value) => {
      onOptionsChange({
        seriesOptions: {
          [key]: {
            [prop]: value,
          },
        },
      });
    },
    [onOptionsChange]
  );
  const [debouncedUpdateSeriesOption] = useDebouncedCallback(updateSeriesOption, 200);

  const columns = useMemo(() => getTableColumns(options, updateSeriesOption, debouncedUpdateSeriesOption), [
    options,
    updateSeriesOption,
    debouncedUpdateSeriesOption,
  ]);

  return (
    <SortableContainer
      axis="y"
      lockAxis="y"
      lockToContainerEdges
      useDragHandle
      helperClass="chart-editor-series-dragged-item"
      helperContainer={(container: any) => container.querySelector("tbody")}
      onSortEnd={handleSortEnd}
      containerProps={{
        className: "chart-editor-series",
      }}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
      <Table
        // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean[]' is not assignable to type 'object... Remove this comment to see the full error message
        dataSource={series}
        columns={columns}
        components={{
          body: {
            row: SortableBodyRow,
          },
        }}
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(item: object) => { index: any; }' is not as... Remove this comment to see the full error message
        onRow={item => ({ index: item.zIndex })}
        pagination={false}
      />
    </SortableContainer>
  );
}

SeriesSettings.propTypes = EditorPropTypes;
