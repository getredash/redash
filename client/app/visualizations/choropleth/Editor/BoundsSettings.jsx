import { isFinite, cloneDeep } from "lodash";
import React, { useState, useEffect, useCallback } from "react";
import { useDebouncedCallback } from "use-debounce";
import * as Grid from "antd/lib/grid";
import { Section, InputNumber, ControlLabel } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";

export default function BoundsSettings({ options, onOptionsChange }) {
  // Bounds may be changed in editor or on preview (by drag/zoom map).
  // Changes from preview does not come frequently (only when user release mouse button),
  // but changes from editor should be debounced.
  // Therefore this component has intermediate state to hold immediate user input,
  // which is updated from `options.bounds` and by inputs immediately on user input,
  // but `onOptionsChange` event is debounced and uses last value from internal state.

  const [bounds, setBounds] = useState(options.bounds);
  const [onOptionsChangeDebounced] = useDebouncedCallback(onOptionsChange, 200);

  useEffect(() => {
    setBounds(options.bounds);
  }, [options.bounds]);

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

  return (
    <React.Fragment>
      <Section>
        <ControlLabel label="North-East latitude and longitude">
          <Grid.Row gutter={15}>
            <Grid.Col span={12}>
              <InputNumber className="w-100" value={bounds[1][0]} onChange={value => updateBounds(1, 0, value)} />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber className="w-100" value={bounds[1][1]} onChange={value => updateBounds(1, 1, value)} />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>

      <Section>
        <ControlLabel label="South-West latitude and longitude">
          <Grid.Row gutter={15}>
            <Grid.Col span={12}>
              <InputNumber className="w-100" value={bounds[0][0]} onChange={value => updateBounds(0, 0, value)} />
            </Grid.Col>
            <Grid.Col span={12}>
              <InputNumber className="w-100" value={bounds[0][1]} onChange={value => updateBounds(0, 1, value)} />
            </Grid.Col>
          </Grid.Row>
        </ControlLabel>
      </Section>
    </React.Fragment>
  );
}

BoundsSettings.propTypes = EditorPropTypes;
