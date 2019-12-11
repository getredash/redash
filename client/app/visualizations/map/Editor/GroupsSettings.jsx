import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations";
import ColorPalette from "@/visualizations/ColorPalette";

import prepareData from "../prepareData";

export default function GroupsSettings({ options, data, onOptionsChange }) {
  const groups = useMemo(
    () => map(prepareData(data, options), ({ name }) => ({ name, color: (options.groups[name] || {}).color || null })),
    [data, options]
  );

  const colors = useMemo(
    () => ({
      Automatic: null,
      ...ColorPalette,
    }),
    []
  );

  const updateGroupOption = useCallback(
    (name, prop, value) => {
      onOptionsChange({
        groups: {
          [name]: {
            [prop]: value,
          },
        },
      });
    },
    [onOptionsChange]
  );

  const columns = [
    {
      title: "Group",
      dataIndex: "name",
    },
    {
      title: "Color",
      dataIndex: "color",
      width: "1%",
      className: "text-nowrap",
      render: (unused, item) => (
        <ColorPicker
          interactive
          presetColors={colors}
          placement="topRight"
          color={item.color}
          triggerProps={{ "data-test": `Map.Editor.Groups.${item.name}.Color` }}
          onChange={value => updateGroupOption(item.name, "color", value)}
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return <Table columns={columns} dataSource={groups} rowKey="name" showHeader={false} pagination={false} />;
}

GroupsSettings.propTypes = EditorPropTypes;
