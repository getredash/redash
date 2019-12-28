import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import ReactSplit from "react-split";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";

import "./index.less";

export default function Split({ toggleShortcut, firstPane, secondPane, ...props }) {
  const reactSplitRef = useRef();
  const wasDragged = useRef(false);
  const lastPaneSize = useRef(null);
  const onToggleFirstPageRef = useRef(() => {
    const element = reactSplitRef.current.parent.firstChild;
    if (lastPaneSize.current === null) {
      lastPaneSize.current = element.style.flexBasis;
      element.style.flexBasis = '10px';
    } else {
      element.style.flexBasis = lastPaneSize.current;
      lastPaneSize.current = null;
    }
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
      ref={reactSplitRef}
      snapOffset={0}
      gutterSize={0}
      gutter={(index, direction) => {
        const gutter = document.createElement('div');
        gutter.className = `split-gutter split-gutter-${direction}`;
        gutter.addEventListener("click", () => {
          if (!wasDragged.current) {
            onToggleFirstPageRef.current();
          }
          wasDragged.current = false;
        }, false);
        return gutter
      }}
      elementStyle={(dimension, elementSize, gutterSize, index) => (index === 0 ? {
        "flex-basis": `${elementSize}%`
      } : {})}
      onDrag={() => {
        // If gutter was dragged - skip next click event on it (don't toggle pane)
        wasDragged.current = true;
      }}
      onDragEnd={() => {
        if (wasDragged.current) {
          lastPaneSize.current = null;
        }
      }}
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
