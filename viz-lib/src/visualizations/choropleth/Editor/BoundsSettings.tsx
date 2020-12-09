import { isArray, isFinite, cloneDeep } from "lodash";
import React, { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { Section, InputNumber, ControlLabel } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations/prop-types";

import useLoadGeoJson from "../hooks/useLoadGeoJson";
import { getGeoJsonBounds } from "./utils";

export default function BoundsSettings({
  options,
  onOptionsChange
}: any) {
  // Bounds may be changed in editor or on preview (by drag/zoom map).
  // Changes from preview does not come frequently (only when user release mouse button),
  // but changes from editor should be debounced.
  // Therefore this component has intermediate state to hold immediate user input,
  // which is updated from `options.bounds` and by inputs immediately on user input,
  // but `onOptionsChange` event is debounced and uses last value from internal state.

  const [bounds, setBounds] = useState(options.bounds);
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  const [geoJson] = useLoadGeoJson(options.mapType);

  // `options.bounds` could be empty only if user didn't edit bounds yet - through preview or in this editor.
  // In this case we should keep empty bounds value because it tells renderer to fit map every time.
  useEffect(() => {
    if (options.bounds) {
      setBounds(options.bounds);
    } else {
      const defaultBounds = getGeoJsonBounds(geoJson);
      if (defaultBounds) {
        setBounds(defaultBounds);
      }
    }
  }, [options.bounds, geoJson]);

  const updateBounds = useCallback(
    (i, j, v) => {
      v = parseFloat(v); // InputNumber may emit `null` and empty strings instead of numbers
      if (isFinite(v)) {
        const newBounds = cloneDeep(bounds);
        newBounds[i][j] = v;
        setBounds(newBounds);
        onOptionsChangeDebounced({ bounds: newBounds });
      }
    },
    [bounds, onOptionsChangeDebounced]
  );

  const boundsAvailable = isArray(bounds);

  return (
    <React.Fragment>
      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
        <ControlLabel label="North-East Latitude and Longitude">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <Grid.Row gutter={15}>
            <Grid.Col span={12}>
              <InputNumber
                disabled={!boundsAvailable}
                value={boundsAvailable ? bounds[1][0] : undefined}
                onChange={(value: any) => updateBounds(1, 0, value)}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                disabled={!boundsAvailable}
                value={boundsAvailable ? bounds[1][1] : undefined}
                onChange={(value: any) => updateBounds(1, 1, value)}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>

      {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
      <Section>
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null | un... Remove this comment to see the full error message */}
        <ControlLabel label="South-West Latitude and Longitude">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
          <Grid.Row gutter={15}>
            <Grid.Col span={12}>
              <InputNumber
                disabled={!boundsAvailable}
                value={boundsAvailable ? bounds[0][0] : undefined}
                onChange={(value: any) => updateBounds(0, 0, value)}
              />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber
                disabled={!boundsAvailable}
                value={boundsAvailable ? bounds[0][1] : undefined}
                onChange={(value: any) => updateBounds(0, 1, value)}
              />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
    </React.Fragment>
  );
}

BoundsSettings.propTypes = EditorPropTypes;
