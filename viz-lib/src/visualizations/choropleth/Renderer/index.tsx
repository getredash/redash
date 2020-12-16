import { omit, noop } from "lodash";
import React, { useState, useEffect, useRef } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";
import useMemoWithDeepCompare from "@/lib/hooks/useMemoWithDeepCompare";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import initChoropleth from "./initChoropleth";
import { prepareData } from "./utils";
import "./renderer.less";

export default function Renderer({
  data,
  options,
  onOptionsChange
}: any) {
  const [container, setContainer] = useState(null);
  const [geoJson] = useLoadGeoJson(options.mapType);
  const onBoundsChangeRef = useRef();
  // @ts-expect-error ts-migrate(2322) FIXME: Type '(...args: any[]) => void' is not assignable ... Remove this comment to see the full error message
  onBoundsChangeRef.current = onOptionsChange ? (bounds: any) => onOptionsChange({ ...options, bounds }) : noop;

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (container) {
      // @ts-expect-error ts-migrate(7019) FIXME: Rest parameter 'args' implicitly has an 'any[]' ty... Remove this comment to see the full error message
      const _map = initChoropleth(container, (...args) => onBoundsChangeRef.current(...args));
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ updateLayers: (geoJson: any, d... Remove this comment to see the full error message
      setMap(_map);
      return () => {
        _map.destroy();
      };
    }
  }, [container]);

  useEffect(() => {
    if (map) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      map.updateLayers(
        geoJson,
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        prepareData(data.rows, optionsWithoutBounds.keyColumn, optionsWithoutBounds.valueColumn),
        options // detect changes for all options except bounds, but pass them all!
      );
    }
  }, [map, geoJson, data.rows, optionsWithoutBounds]); // eslint-disable-line react-hooks/exhaustive-deps

  // This may come only from editor
  useEffect(() => {
    if (map) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      map.updateBounds(options.bounds);
    }
  }, [map, options, onOptionsChange]);

  return (
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
    <div className="map-visualization-container" style={{ background: options.colors.background }} ref={setContainer} />
  );
}

Renderer.propTypes = RendererPropTypes;
