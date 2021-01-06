import { isFunction, wrap } from "lodash";
import React, { useRef, useState } from "react";
import cx from "classnames";
// @ts-expect-error ts-migrate(2724) FIXME: Module '"../../../node_modules/react-sortable-hoc/... Remove this comment to see the full error message
import { sortableContainer, sortableElement, sortableHandle } from "react-sortable-hoc";

import "./style.less";

export const DragHandle = sortableHandle(({ className, ...restProps }: any) => (
  <div className={cx("drag-handle", className)} {...restProps} />
));

export const SortableContainerWrapper = sortableContainer(({ children }: any) => children);

export const SortableElement = sortableElement(({ children }: any) => children);

type OwnProps = {
  disabled?: boolean;
  containerComponent?: React.ReactElement;
  containerProps?: any;
  children?: React.ReactNode;
};

type Props = OwnProps & typeof SortableContainer.defaultProps;

export function SortableContainer({ disabled, containerComponent, containerProps, children, ...wrapperProps }: Props) {
  const containerRef = useRef();
  const [isDragging, setIsDragging] = useState(false);

  wrapperProps = { ...wrapperProps };
  containerProps = { ...containerProps };

  if (disabled) {
    // Disabled state:
    // - forbid drag'n'drop (and therefore no need to hook events
    // - don't override anything on container element
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'shouldCancelStart' does not exist on typ... Remove this comment to see the full error message
    wrapperProps.shouldCancelStart = () => true;
  } else {
    // Enabled state:

    // - use container element as a default helper element
    // @ts-expect-error
    wrapperProps.helperContainer = wrap(wrapperProps.helperContainer, helperContainer =>
      isFunction(helperContainer) ? helperContainer(containerRef.current) : containerRef.current
    );

    // - hook drag start/end events
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'updateBeforeSortStart' does not exist on... Remove this comment to see the full error message
    wrapperProps.updateBeforeSortStart = wrap(wrapperProps.updateBeforeSortStart, (updateBeforeSortStart, ...args) => {
      setIsDragging(true);
      if (isFunction(updateBeforeSortStart)) {
        updateBeforeSortStart(...args);
      }
    });
    // @ts-expect-error
    wrapperProps.onSortStart = wrap(wrapperProps.onSortStart, (onSortStart, ...args) => {
      if (isFunction(onSortStart)) {
        onSortStart(...args);
      } else {
        const event = args[1] as DragEvent;
        event.preventDefault();
      }
    });

    // @ts-expect-error ts-migrate(2339) FIXME: Property 'onSortEnd' does not exist on type '{}'.
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
      {/* @ts-expect-error ts-migrate(2604) FIXME: JSX element type 'ContainerComponent' does not hav... Remove this comment to see the full error message */}
      <ContainerComponent {...containerProps}>{children}</ContainerComponent>
    </SortableContainerWrapper>
  );
}

SortableContainer.defaultProps = {
  disabled: false,
  containerComponent: "div",
  containerProps: {},
  children: null,
};
