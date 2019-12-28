import React, { useRef } from 'react';
import PropTypes from 'prop-types';
import ReactSplit from "react-split";

import "./index.less";

export default function Split({ firstPane, secondPane, ...props }) {
  const onGutterClickRef = useRef(() => {
    console.log("gutter click");
  });

  return (
    <ReactSplit
      {...props}
      snapOffset={0}
      gutterSize={0}
      gutter={(index, direction) => {
        const gutter = document.createElement('div');
        gutter.className = `split-gutter split-gutter-${direction}`;
        gutter.addEventListener("click", () => onGutterClickRef.current(), false);
        return gutter
      }}
      elementStyle={(dimension, elementSize, gutterSize, index) => (index === 0 ? {
        "flex-basis": `${elementSize}%`
      } : {})}
    >
      {firstPane}
      {secondPane}
    </ReactSplit>
  );
}

Split.propTypes = {
  firstPane: PropTypes.node,
  secondPane: PropTypes.node,
};

Split.defaultProps = {
  firstPane: null,
  secondPane: null,
};
