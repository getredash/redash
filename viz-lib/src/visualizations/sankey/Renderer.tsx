import React, { useState, useEffect, useMemo } from "react";
import resizeObserver from "@/services/resizeObserver";
import { RendererPropTypes } from "@/visualizations/prop-types";

import { SankeyDataType } from "./index";
import initSankey, { ExtendedSankeyDataType } from "./initSankey";
import "./renderer.less";
import NotEnoughData from '@/components/NotEnoughData';

export default function Renderer({ data }: { data: SankeyDataType }) {
  const [container, setContainer] = useState<null | HTMLDivElement>(null);

  const render = useMemo(() => initSankey(data as ExtendedSankeyDataType), [data]);

  useEffect(() => {
    if (container) {
      render(container);
      const unwatch = resizeObserver(container, () => {
        render(container);
      });
      return unwatch;
    }
  }, [container, render]);

  if(data?.rows?.length === 0 || !data?.rows ) return <NotEnoughData />

  return <div className="sankey-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
