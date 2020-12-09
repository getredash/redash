import { isEqual, omit, merge } from "lodash";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import prepareData from "./prepareData";
import initMap from "./initMap";

function useMemoWithDeepCompare(create: any, inputs: any) {
  const valueRef = useRef();
  const value = useMemo(create, inputs);
  if (!isEqual(value, valueRef.current)) {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'unknown' is not assignable to type 'undefine... Remove this comment to see the full error message
    valueRef.current = value;
  }
  return valueRef.current;
}

export default function Renderer({
  data,
  options,
  onOptionsChange
}: any) {
  const [container, setContainer] = useState(null);

  const optionsWithoutBounds = useMemoWithDeepCompare(() => omit(options, ["bounds"]), [options]);

  const groups = useMemo(() => prepareData(data, optionsWithoutBounds), [data, optionsWithoutBounds]);

  const [map, setMap] = useState(null);

  useEffect(() => {
    if (container) {
      const _map = initMap(container);
      // @ts-expect-error ts-migrate(2345) FIXME: Argument of type '{ onBoundsChange: () => void; up... Remove this comment to see the full error message
      setMap(_map);
      return () => {
        _map.destroy();
      };
    }
  }, [container]);

  useEffect(() => {
    if (map) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      map.updateLayers(groups, optionsWithoutBounds);
    }
  }, [map, groups, optionsWithoutBounds]);

  useEffect(() => {
    if (map) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      map.updateBounds(options.bounds);
    }
  }, [map, options.bounds]);

  useEffect(() => {
    if (map && onOptionsChange) {
      // @ts-expect-error ts-migrate(2531) FIXME: Object is possibly 'null'.
      map.onBoundsChange = (bounds: any) => {
        onOptionsChange(merge({}, options, { bounds }));
      };
    }
  }, [map, options, onOptionsChange]);

  // @ts-expect-error ts-migrate(2322) FIXME: Type 'Dispatch<SetStateAction<null>>' is not assig... Remove this comment to see the full error message
  return <div className="map-visualization-container" ref={setContainer} />;
}

Renderer.propTypes = RendererPropTypes;
