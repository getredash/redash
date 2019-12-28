import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactSplit from "react-split";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";

import "./index.less";

export default function Split({ toggleShortcut, firstPane, secondPane, ...props }) {
  const onToggleFirstPageRef = useRef(() => {
    console.log("toggle pane");
  });

  useEffect(() => {
    if (toggleShortcut) {
      const shortcuts = {
        [toggleShortcut]: () => {
          onToggleFirstPageRef.current();
        },
      };

      KeyboardShortcuts.bind(shortcuts);
      return () => {
        KeyboardShortcuts.unbind(shortcuts);
      };
    }
  }, [toggleShortcut]);

  return (
    <ReactSplit
      {...props}
      snapOffset={0}
      gutterSize={0}
      gutter={(index, direction) => {
        const gutter = document.createElement('div');
        gutter.className = `split-gutter split-gutter-${direction}`;
        gutter.addEventListener("click", () => onToggleFirstPageRef.current(), false);
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
  toggleShortcut: PropTypes.string,
  firstPane: PropTypes.node,
  secondPane: PropTypes.node,
};

Split.defaultProps = {
  toggleShortcut: null,
  firstPane: null,
  secondPane: null,
};
