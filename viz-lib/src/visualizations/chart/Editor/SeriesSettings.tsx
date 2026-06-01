import { includes, map, extend, fromPairs } from "lodash";
import React, { useMemo, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import Table from "antd/lib/table";
import Input from "antd/lib/input";
import Radio from "antd/lib/radio";
import { SortableContainer, DragHandle, SortableElement } from "@/components/sortable";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ChartTypeSelect from "./ChartTypeSelect";
import getChartData from "../getChartData";

const SortableBodyRow = (props: any) => <SortableElement as="tr" {...props} />;

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
          onChange={(event) => debouncedUpdateSeriesOption(item.key, "name", event.target.value)}
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
            onChange={(event) => updateSeriesOption(item.key, "yAxis", event.target.value)}
          >
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
          popupMatchSelectWidth={false}
          value={item.type}
          hiddenChartTypes={["pie", "heatmap", "bubble", "box"]}
          onChange={(value: any) => updateSeriesOption(item.key, "type", value)}
        />
      ),
    });
  }

  return result;
}

export default function SeriesSettings({ options, data, onOptionsChange }: any) {
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
    ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => {
      const seriesOptions = [...series];
      seriesOptions.splice(newIndex, 0, ...seriesOptions.splice(oldIndex, 1));
      onOptionsChange({
        seriesOptions: fromPairs(seriesOptions.map((item: any, zIndex: number) => [item.key, { zIndex }])),
      });
    },
    [onOptionsChange, series]
  );

  const updateSeriesOption = useCallback(
    (key: any, prop: any, value: any) => {
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

  const columns = useMemo(
    () => getTableColumns(options, updateSeriesOption, debouncedUpdateSeriesOption),
    [options, updateSeriesOption, debouncedUpdateSeriesOption]
  );

  const items = useMemo(() => series.map((item: any) => item.key), [series]);

  return (
    <SortableContainer
      items={items}
      axis="y"
      lockAxis="y"
      lockToContainerEdges
      useDragHandle
      helperClass="chart-editor-series-dragged-item"
      helperContainer={(container: any) => container.querySelector("tbody")}
      onSortEnd={handleSortEnd}
      containerProps={{
        className: "chart-editor-series",
      }}
    >
      <Table
        dataSource={series}
        columns={columns}
        components={{
          body: {
            row: SortableBodyRow,
          },
        }}
        onRow={(item: any) => ({ id: item.key, index: item.zIndex })}
        pagination={false}
      />
    </SortableContainer>
  );
}

SeriesSettings.propTypes = EditorPropTypes;
