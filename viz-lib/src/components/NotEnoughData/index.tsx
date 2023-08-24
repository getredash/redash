import React from "react";
import { NotEnoughDataSvg } from "./Svg";
import "./index.less";

export default function NotEnoughData() {
  return (
    <div className="not-enough-data-container">
      <NotEnoughDataSvg />
      <div className="not-enough-data-header">Not enough data</div>
      <div className="not-enough-data-caption">Currently, there is not enough information</div>
    </div>
  );
}
