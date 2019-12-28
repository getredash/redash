import d3 from "d3";
import React, { useRef, useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Resizable as ReactResizable } from "react-resizable";
import { KeyboardShortcuts } from "@/services/keyboard-shortcuts";

import "./index.less";

export default function Resizable({ toggleShortcut, direction, children }) {
  const [size, setSize] = useState(0);
  const childrenRef = useRef();

  const wasDragged = useRef(false);
  const lastPaneSize = useRef(null);
  const onToggleRef = useRef(() => {
    const element = d3.select(childrenRef.current);
    let targetSize;
    if (lastPaneSize.current === null) {
      targetSize = "0px";
      lastPaneSize.current = element.style("flex-basis");
    } else {
      targetSize = lastPaneSize.current;
      lastPaneSize.current = null;
    }

    element
      .transition()
      .duration(200)
      .ease("swing")
      .style("flex-basis", targetSize);
  });

  const sizeProp = direction === "horizontal" ? "width" : "height";

  useEffect(() => {
    if (toggleShortcut) {
      const shortcuts = {
        [toggleShortcut]: () => {
          onToggleRef.current();
        },
      };

      KeyboardShortcuts.bind(shortcuts);
      return () => {
        KeyboardShortcuts.unbind(shortcuts);
      };
    }
  }, [toggleShortcut]);

  if (!children) {
    return null;
  }

  children = React.createElement(children.type, { ...children.props, ref: childrenRef });

  return (
    <ReactResizable
      axis={direction === "horizontal" ? "x" : "y"}
      resizeHandles={[direction === "horizontal" ? "e" : "s"]}
      handle={
        <span
          className={`react-resizable-handle react-resizable-handle-${direction}`}
          onClick={() => {
            if (!wasDragged.current) {
              onToggleRef.current();
            }
            wasDragged.current = false;
          }}
        />
      }
      width={direction === "horizontal" ? size : 0}
      height={direction === "vertical" ? size : 0}
      minConstraints={[0, 0]}
      onResizeStart={(unused, data) => {
        const element = data.node.parentNode;
        const newSize = Math.floor(element.getBoundingClientRect()[sizeProp]);
        setSize(newSize);
      }}
      onResize={(unused, data) => {
        const element = data.node.parentNode;
        element.style.flexBasis = `${data.size[sizeProp]}px`;
        setSize(data.size[sizeProp]);
        wasDragged.current = true;
      }}
      onResizeStop={(unused, data) => {
        const element = data.node.parentNode;
        const newSize = Math.floor(element.getBoundingClientRect()[sizeProp]);
        setSize(newSize);
        if (wasDragged.current) {
          lastPaneSize.current = null;
        }
      }}>
      {children}
    </ReactResizable>
  );
}

Resizable.propTypes = {
  direction: PropTypes.oneOf(["horizontal", "vertical"]),
  toggleShortcut: PropTypes.string,
  children: PropTypes.element,
};

Resizable.defaultProps = {
  direction: "horizontal",
  toggleShortcut: null,
  children: null,
};
