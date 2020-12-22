import { map } from "lodash";
import React, { useMemo, useCallback } from "react";
import Table from "antd/lib/table";
import ColorPicker from "@/components/ColorPicker";
import { EditorPropTypes } from "@/visualizations/prop-types";
import ColorPalette from "@/visualizations/ColorPalette";

import prepareData from "../prepareData";

export default function GroupsSettings({
  options,
  data,
  onOptionsChange
}: any) {
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
      render: (unused: any, item: any) => (
        <ColorPicker
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'.
          interactive
          // @ts-expect-error ts-migrate(2322) FIXME: Type '{ "Indian Red": string; "Green 2": string; "... Remove this comment to see the full error message
          presetColors={colors}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          placement="topRight"
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'.
          color={item.color}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'.
          triggerProps={{ "data-test": `Map.Editor.Groups.${item.name}.Color` }}
          // @ts-expect-error ts-migrate(2322) FIXME: Type '(value: any) => void' is not assignable to t... Remove this comment to see the full error message
          onChange={(value: any) => updateGroupOption(item.name, "color", value)}
          // @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'never'.
          addonAfter={<ColorPicker.Label color={item.color} presetColors={colors} />}
        />
      ),
    },
  ];

  return <Table columns={columns} dataSource={groups} rowKey="name" showHeader={false} pagination={false} />;
}

GroupsSettings.propTypes = EditorPropTypes;
