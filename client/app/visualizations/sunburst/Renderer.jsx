import React, { useState, useEffect, useMemo } from "react";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations";

import initSunburst from "./initSunburst";
import "./renderer.less";

export default function Renderer({ data }) {
  const [container, setContainer] = useState(null);

  const render = useMemo(() => initSunburst(data), [data]);

  useEffect(() => {
    if (container) {
      render(container);
      const unwatch = resizeObserver(container, () => {
        render(container);
      });
      return unwatch;
    }
  }, [container, render]);

  return <div className="sunburst-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
