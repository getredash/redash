import { map } from "lodash";
import React from "react";
import ColorPicker from "@/components/ColorPicker";

type OwnProps = {
    items?: {
        color: string;
        text: string;
    }[];
    alignText?: "left" | "center" | "right";
};

type Props = OwnProps & typeof Legend.defaultProps;

export default function Legend({ items, alignText }: Props) {
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

Legend.defaultProps = {
  items: [],
  alignText: "left",
};
