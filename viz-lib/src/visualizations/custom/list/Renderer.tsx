import React, { useState } from "react";
import getData from "./getData";
import { Select } from "antd";

import "./Renderer.less";

type Country = {
  name: string;
  value: number;
};

function LocationCard({ index, name, value, thumbnail }: Country & { index: number; thumbnail: string }) {
  return (
    <div className="card-wrapper">
      <div className="card-container">
        <div className="card-index">{index}.</div>
        <img alt={name} src={thumbnail} className="card-thumbnail" />
        <div className="card-title">{name}</div>
      </div>
      <div className="card-value">{value}%</div>
    </div>
  );
}

function SafeTopLocations({ items, columns }: any) {
  const [selectedColumn, setSelectedColumn] = useState(columns[0]);

  const row = items[selectedColumn].data;

  const options = columns.map((column: any) => ({
    value: column,
    label: column,
  }));

  return (
    <div className="list-wrapper">
      <Select
        options={options}
        defaultValue={columns[0]}
        style={{ width: 200, paddingLeft: 12 }}
        onChange={v => setSelectedColumn(v)}
      />
      <div className="list-container">
        {row.map(({ x, y, thumbnail }: any, i: any) => (
          <LocationCard key={i} index={i + 1} name={x} value={y} thumbnail={thumbnail} />
        ))}
      </div>
    </div>
  );
}

export default function Renderer(input: any) {
  const items = getData(input.data.rows, input.options);

  const columns = Object.keys(items);

  return <SafeTopLocations items={items} columns={columns} />;
}
