import { isFunction, wrap } from "lodash";
import React, { useRef, useState } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { sortableContainer, sortableElement, sortableHandle } from "react-sortable-hoc";

import "./style.less";

export const DragHandle = sortableHandle(({ className, ...restProps }) => (
  <div className={cx("drag-handle", className)} {...restProps} />
));

export const SortableContainerWrapper = sortableContainer(({ children }) => children);

export const SortableElement = sortableElement(({ children }) => children);

export function SortableContainer({ disabled, containerComponent, containerProps, children, ...wrapperProps }) {
  const containerRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  wrapperProps = { ...wrapperProps };
  containerProps = { ...containerProps };

  if (disabled) {
    // Disabled state:
    // - forbid drag'n'drop (and therefore no need to hook events
    // - don't override anything on container element
    wrapperProps.shouldCancelStart = () => true;
  } else {
    // Enabled state:

    // - use container element as a default helper element
    wrapperProps.helperContainer = wrap(wrapperProps.helperContainer, helperContainer =>
      isFunction(helperContainer) ? helperContainer(containerRef.current) : containerRef.current
    );

    // - hook drag start/end events
    wrapperProps.updateBeforeSortStart = wrap(wrapperProps.updateBeforeSortStart, (updateBeforeSortStart, ...args) => {
      setIsDragging(true);
      if (isFunction(updateBeforeSortStart)) {
        updateBeforeSortStart(...args);
      }
    });
    wrapperProps.onSortEnd = wrap(wrapperProps.onSortEnd, (onSortEnd, ...args) => {
      setIsDragging(false);
      if (isFunction(onSortEnd)) {
        onSortEnd(...args);
      }
    });

    // - update container element: add classes and take a ref
    containerProps.className = cx(
      "sortable-container",
      { "sortable-container-dragging": isDragging },
      containerProps.className
    );
    containerProps.ref = containerRef;
  }

  const ContainerComponent = containerComponent;
  return (
    <SortableContainerWrapper {...wrapperProps}>
      <ContainerComponent {...containerProps}>{children}</ContainerComponent>
    </SortableContainerWrapper>
  );
}

SortableContainer.propTypes = {
  disabled: PropTypes.bool,
  containerComponent: PropTypes.elementType,
  containerProps: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  children: PropTypes.node,
};

SortableContainer.defaultProps = {
  disabled: false,
  containerComponent: "div",
  containerProps: {},
  children: null,
};
