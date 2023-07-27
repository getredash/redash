import React from "react";
import getData from "./getData";

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

function SafeTopLocations({ items }: any) {
  return (
    <div className="list-container">
      {items.map(({ x, y, thumbnail }: any, i: any) => (
        <LocationCard key={i} index={i + 1} name={x} value={y} thumbnail={thumbnail} />
      ))}
    </div>
  );
}

export default function Renderer(input: any) {
  const items = getData(input.data.rows, input.options);

  return <SafeTopLocations items={items} />;
}
