import { map } from "lodash";
import React from "react";
import ColorPicker from "@/components/ColorPicker";

// Define the props directly, making them optional
type LegendProps = {
  items?: {
    color: string;
    text: string;
  }[];
  alignText?: "left" | "center" | "right";
};

// Use default values directly in the function signature or body
export default function Legend({ items = [], alignText = "left" }: LegendProps) {
  return (
    <div className="choropleth-visualization-legend">
      {map(items, (item, index) => (
        <div key={`legend${index}`} className="legend-item">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
          <ColorPicker.Swatch color={item.color} />
          <div className={`legend-item-text text-${alignText}`}>{item.text}</div>
        </div>
      ))}
    </div>
  );
}
