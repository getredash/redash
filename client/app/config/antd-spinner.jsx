import React from "react";
import Spin from "antd/lib/spin";

Spin.setDefaultIndicator(
  <span role="status" aria-live="polite" aria-relevant="additions removals">
    <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
    <span className="sr-only">Loading...</span>
  </span>
);
