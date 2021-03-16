import React from "react";
import Spin from "antd/lib/spin";

Spin.setDefaultIndicator(
  <>
    <i className="fa fa-spinner fa-pulse" aria-hidden="true" />
    <span className="sr-only" aria-live="polite">
      Loading...
    </span>
  </>
);
