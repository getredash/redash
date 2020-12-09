import React, { useState, useEffect, useMemo } from "react";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations/prop-types";

import initSankey from "./initSankey";
import "./renderer.less";

export default function Renderer({
  data
}: any) {
  const [container, setContainer] = useState(null);

  const render = useMemo(() => initSankey(data), [data]);

  useEffect(() => {
    if (container) {
      render(container);
      const unwatch = resizeObserver(container, () => {
        render(container);
      });
      return unwatch;
    }
  }, [container, render]);

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
  return <div className="sankey-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
