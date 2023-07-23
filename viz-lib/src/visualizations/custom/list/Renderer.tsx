import React from "react";

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
      {items.map(({ title, rating, thumbnail }: any, i: any) => (
        <LocationCard key={i} index={i + 1} name={title} value={rating} thumbnail={thumbnail} />
      ))}
    </div>
  );
}

export default function Renderer({ options, data }: any) {
  const items = data.rows.slice(0, 9);

  return <SafeTopLocations items={items} />;
}
