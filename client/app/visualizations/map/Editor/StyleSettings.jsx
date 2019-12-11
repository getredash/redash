import { isNil, map } from "lodash";
import React, { useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { Section, Select, Checkbox, Input, ColorPicker, ContextHelp } from "@/components/visualizations/editor";
import { EditorPropTypes } from "@/visualizations";
import ColorPalette from "@/visualizations/ColorPalette";

const mapTiles = [
  {
    name: "OpenStreetMap",
    url: "//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  },
  {
    name: "OpenStreetMap BW",
    url: "//{s}.tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png",
  },
  {
    name: "OpenStreetMap DE",
    url: "//{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png",
  },
  {
    name: "OpenStreetMap FR",
    url: "//{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png",
  },
  {
    name: "OpenStreetMap Hot",
    url: "//{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
  },
  {
    name: "Thunderforest",
    url: "//{s}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png",
  },
  {
    name: "Thunderforest Spinal",
    url: "//{s}.tile.thunderforest.com/spinal-map/{z}/{x}/{y}.png",
  },
  {
    name: "OpenMapSurfer",
    url: "//korona.geog.uni-heidelberg.de/tiles/roads/x={x}&y={y}&z={z}",
  },
  {
    name: "Stamen Toner",
    url: "//stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}.png",
  },
  {
    name: "Stamen Toner Background",
    url: "//stamen-tiles-{s}.a.ssl.fastly.net/toner-background/{z}/{x}/{y}.png",
  },
  {
    name: "Stamen Toner Lite",
    url: "//stamen-tiles-{s}.a.ssl.fastly.net/toner-lite/{z}/{x}/{y}.png",
  },
  {
    name: "OpenTopoMap",
    url: "//{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
  },
];

const CustomColorPalette = {
  White: "#ffffff",
  ...ColorPalette,
};

function getCustomIconOptionFields(iconShape) {
  switch (iconShape) {
    case "doughnut":
      return { showIcon: false, showBackgroundColor: true, showBorderColor: true };
    case "circle-dot":
    case "rectangle-dot":
      return { showIcon: false, showBackgroundColor: false, showBorderColor: true };
    default:
      return { showIcon: true, showBackgroundColor: true, showBorderColor: true };
  }
}

export default function StyleSettings({ options, onOptionsChange }) {
  const [debouncedOnOptionsChange] = useDebouncedCallback(onOptionsChange, 200);

  const { showIcon, showBackgroundColor, showBorderColor } = useMemo(
    () => getCustomIconOptionFields(options.iconShape),
    [options.iconShape]
  );

  const isCustomMarkersStyleAllowed = isNil(options.classify);

  return (
    <React.Fragment>
      <Section>
        <Select
          label="Map Tiles"
          data-test="Map.Editor.Tiles"
          className="w-100"
          value={options.mapTileUrl}
          onChange={mapTileUrl => onOptionsChange({ mapTileUrl })}>
          {map(mapTiles, ({ name, url }) => (
            <Select.Option key={url} data-test={"Map.Editor.Tiles." + name}>
              {name}
            </Select.Option>
          ))}
        </Select>
      </Section>

      <Section.Title>Markers</Section.Title>

      <Section>
        <Checkbox
          data-test="Map.Editor.ClusterMarkers"
          defaultChecked={options.clusterMarkers}
          onChange={event => onOptionsChange({ clusterMarkers: event.target.checked })}>
          Cluster Markers
        </Checkbox>
      </Section>

      <Section>
        <Checkbox
          data-test="Map.Editor.CustomizeMarkers"
          disabled={!isCustomMarkersStyleAllowed}
          defaultChecked={options.customizeMarkers}
          onChange={event => onOptionsChange({ customizeMarkers: event.target.checked })}>
          Override default style
        </Checkbox>
        {!isCustomMarkersStyleAllowed && (
          <ContextHelp placement="topLeft" arrowPointAtCenter>
            Custom marker styles are not available
            <br />
            when <b>Group By</b> column selected.
          </ContextHelp>
        )}
      </Section>

      {isCustomMarkersStyleAllowed && options.customizeMarkers && (
        <React.Fragment>
          <Section>
            <Select
              layout="horizontal"
              label="Shape"
              className="w-100"
              data-test="Map.Editor.MarkerShape"
              value={options.iconShape}
              onChange={iconShape => onOptionsChange({ iconShape })}>
              <Select.Option key="marker" data-test="Map.Editor.MarkerShape.marker">
                Marker + Icon
              </Select.Option>
              <Select.Option key="doughnut" data-test="Map.Editor.MarkerShape.doughnut">
                Circle
              </Select.Option>
              <Select.Option key="circle-dot" data-test="Map.Editor.MarkerShape.circle-dot">
                Circle Dot
              </Select.Option>
              <Select.Option key="circle" data-test="Map.Editor.MarkerShape.circle">
                Circle + Icon
              </Select.Option>
              <Select.Option key="rectangle-dot" data-test="Map.Editor.MarkerShape.rectangle-dot">
                Square Dot
              </Select.Option>
              <Select.Option key="rectangle" data-test="Map.Editor.MarkerShape.rectangle">
                Square + Icon
              </Select.Option>
            </Select>
          </Section>

          {showIcon && (
            <Section>
              <Input
                layout="horizontal"
                label={
                  <React.Fragment>
                    Icon
                    <ContextHelp placement="topLeft" arrowPointAtCenter>
                      <div className="m-b-5">
                        Enter an icon name from{" "}
                        <a href="https://fontawesome.com/v4.7.0/icons/" target="_blank" rel="noopener noreferrer">
                          Font-Awesome 4.7
                        </a>
                      </div>
                      <div className="m-b-5">
                        Examples: <code>check</code>, <code>times-circle</code>, <code>flag</code>
                      </div>
                      <div>Leave blank to remove.</div>
                    </ContextHelp>
                  </React.Fragment>
                }
                className="w-100"
                data-test="Map.Editor.MarkerIcon"
                defaultValue={options.iconFont}
                onChange={event => debouncedOnOptionsChange({ iconFont: event.target.value })}
              />
            </Section>
          )}

          {showIcon && (
            <Section>
              <ColorPicker
                layout="horizontal"
                label="Icon Color"
                interactive
                presetColors={CustomColorPalette}
                placement="topRight"
                color={options.foregroundColor}
                triggerProps={{ "data-test": "Map.Editor.MarkerIconColor" }}
                onChange={foregroundColor => onOptionsChange({ foregroundColor })}
                addonAfter={<ColorPicker.Label color={options.foregroundColor} presetColors={CustomColorPalette} />}
              />
            </Section>
          )}

          {showBackgroundColor && (
            <Section>
              <ColorPicker
                layout="horizontal"
                label="Background Color"
                interactive
                presetColors={CustomColorPalette}
                placement="topRight"
                color={options.backgroundColor}
                triggerProps={{ "data-test": "Map.Editor.MarkerBackgroundColor" }}
                onChange={backgroundColor => onOptionsChange({ backgroundColor })}
                addonAfter={<ColorPicker.Label color={options.backgroundColor} presetColors={CustomColorPalette} />}
              />
            </Section>
          )}

          {showBorderColor && (
            <Section>
              <ColorPicker
                layout="horizontal"
                label="Border Color"
                interactive
                presetColors={CustomColorPalette}
                placement="topRight"
                color={options.borderColor}
                triggerProps={{ "data-test": "Map.Editor.MarkerBorderColor" }}
                onChange={borderColor => onOptionsChange({ borderColor })}
                addonAfter={<ColorPicker.Label color={options.borderColor} presetColors={CustomColorPalette} />}
              />
            </Section>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
}

StyleSettings.propTypes = EditorPropTypes;
