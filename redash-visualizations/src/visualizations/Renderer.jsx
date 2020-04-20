import { isEqual } from "lodash";
import React, { useEffect, useRef } from "react";
import PropTypes from "prop-types";
import ErrorBoundary, { ErrorMessage } from "@/components/ErrorBoundary";
import { RendererPropTypes } from "@/visualizations/prop-types";
import registeredVisualizations from "@/visualizations/registeredVisualizations";

export default function Renderer({
  type,
  data,
  options: optionsProp,
  visualizationName,
  addonBefore,
  addonAfter,
  ...otherProps
}) {
  const lastOptions = useRef();
  const errorHandlerRef = useRef();

  const { Renderer, getOptions } = registeredVisualizations[type];

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
    <div className="visualization-renderer">
      {addonBefore}
      <ErrorBoundary
        ref={errorHandlerRef}
        renderError={() => <ErrorMessage>Error while rendering visualization.</ErrorMessage>}>
        <div className="visualization-renderer-wrapper">
          <Renderer options={options} data={data} visualizationName={visualizationName} {...otherProps} />
        </div>
      </ErrorBoundary>
      {addonAfter}
    </div>
  );
}

Renderer.propTypes = {
  type: PropTypes.string.isRequired,
  addonBefore: PropTypes.node,
  addonAfter: PropTypes.node,
  ...RendererPropTypes,
};
