import React, { useRef, useEffect } from "react";
import { isEqual } from "lodash";
import PropTypes from "prop-types";
import registeredVisualizations from "../";

export default function VisualizationRenderer(props) {
  const lastOptions = useRef();
  const errorHandlerRef = useRef();

  const { type, options: optionsProp, data, visualizationName } = props;
  const { Renderer, Editor, getOptions } = registeredVisualizations[type];

  // Avoid unnecessary updates (which may be expensive or cause issues with
  // internal state of some visualizations like Table) - compare options deeply
  // and use saved reference if nothing changed
  // More details: https://github.com/getredash/redash/pull/3963#discussion_r306935810
  let options = getOptions(optionsProp, data);
  if (isEqual(lastOptions.current, options)) {
    options = lastOptions.current;
  }
  lastOptions.current = options;

  useEffect(() => {
    if (errorHandlerRef.current) {
      errorHandlerRef.current.reset();
    }
  }, [optionsProp, data]);

  return (
    <div>
      <Editor data={data} options={options} visualizationName={visualizationName} onOptionsChange={() => {}} />
      <Renderer options={options} data={data} visualizationName={visualizationName} />
    </div>
  );
}

VisualizationRenderer.propTypes = {
  type: PropTypes.string.isRequired,
  visualizationName: PropTypes.string,
  data: PropTypes.any,
};
