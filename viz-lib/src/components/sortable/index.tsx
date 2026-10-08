import { range } from "lodash";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import cx from "classnames";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";

import "./style.less";

// Sortable lists built on dnd-kit. Items are identified by their position: wrap each one in
// `SortableElement` (or a component made with `sortableElement`) with its `index`, render a
// `DragHandle` inside it, and handle `onSortEnd({ oldIndex, newIndex })` on the container.

const SORTABLE_ELEMENT_CLASS = "sortable-element";

const itemId = (index: number) => `item-${index}`;
const itemIndex = (id: string | number) => Number(String(id).slice("item-".length));

type SortableItemContextValue = ReturnType<typeof useSortable> | null;

const SortableItemContext = createContext<SortableItemContextValue>(null);
const HelperClassContext = createContext<string | undefined>(undefined);

export function DragHandle({ className, ...restProps }: any) {
  const item = useContext(SortableItemContext);
  const setNodeRef = item?.setNodeRef;
  const setActivatorNodeRef = item?.setActivatorNodeRef;

  // The handle is inside the sortable element, so it can find that element's DOM node. This works
  // for elements that don't expose their DOM node through a ref (like antd's Collapse.Panel).
  const ref = useCallback(
    (node: HTMLElement | null) => {
      setActivatorNodeRef?.(node);
      setNodeRef?.(node ? (node.closest(`.${SORTABLE_ELEMENT_CLASS}`) as HTMLElement) : null);
    },
    [setNodeRef, setActivatorNodeRef]
  );

  return (
    <div
      ref={ref}
      className={cx("drag-handle", className)}
      {...(item ? item.attributes : {})}
      {...(item ? item.listeners : {})}
      {...restProps}
    />
  );
}

function useSortableElementProps(index: number, className?: string, style?: React.CSSProperties) {
  const sortable = useSortable({ id: itemId(index) });
  const helperClass = useContext(HelperClassContext);
  const { transform, transition, isDragging } = sortable;

  return {
    sortable,
    className: cx(SORTABLE_ELEMENT_CLASS, className, { [helperClass || ""]: isDragging && helperClass }),
    style: {
      ...style,
      transform: CSS.Translate.toString(transform),
      transition,
      ...(isDragging ? { position: "relative", zIndex: 1 } : {}),
    } as React.CSSProperties,
  };
}

// Wraps a component so it can be used as a sortable element; it takes an extra `index` prop.
// The component must pass `className` and `style` through to its root DOM element.
export function sortableElement(Component: React.ComponentType<any>) {
  function SortableElementComponent({ index, ...props }: any) {
    const { sortable, className, style } = useSortableElementProps(index, props.className, props.style);
    return (
      <SortableItemContext.Provider value={sortable}>
        <Component {...props} className={className} style={style} />
      </SortableItemContext.Provider>
    );
  }
  SortableElementComponent.displayName = `sortableElement(${Component.displayName || Component.name || "Component"})`;
  return SortableElementComponent;
}

// Makes its only child (which must accept `className` and `style`) a sortable element.
export function SortableElement({ index, children }: { index: number; children: React.ReactElement<any> }) {
  const { sortable, className, style } = useSortableElementProps(index, children.props.className, children.props.style);
  return (
    <SortableItemContext.Provider value={sortable}>
      {React.cloneElement(children, { className, style })}
    </SortableItemContext.Provider>
  );
}

type OwnProps = {
  disabled?: boolean;
  itemCount: number;
  axis?: "y" | "xy";
  lockAxis?: "y";
  lockToContainerEdges?: boolean;
  helperClass?: string;
  onSortEnd?: (sort: { oldIndex: number; newIndex: number }) => void;
  containerComponent?: React.ElementType;
  containerProps?: any;
  children?: React.ReactNode;
};

export function SortableContainer({
  disabled = false,
  itemCount,
  axis = "y",
  lockAxis,
  lockToContainerEdges = false,
  helperClass,
  onSortEnd,
  containerComponent: ContainerComponent = "div",
  containerProps = {},
  children = null,
}: OwnProps) {
  const [isDragging, setIsDragging] = useState(false);
  // Mouse (rather than pointer) events, so that e2e tests can drag by triggering mouse events
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const items = useMemo(() => range(itemCount).map(itemId), [itemCount]);
  const modifiers = useMemo(() => {
    const result: Modifier[] = [];
    if (lockAxis === "y") {
      result.push(restrictToVerticalAxis);
    }
    if (lockToContainerEdges) {
      result.push(restrictToParentElement);
    }
    return result;
  }, [lockAxis, lockToContainerEdges]);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setIsDragging(false);
      if (over && onSortEnd) {
        onSortEnd({ oldIndex: itemIndex(active.id), newIndex: itemIndex(over.id) });
      }
    },
    [onSortEnd]
  );

  const container = (
    <ContainerComponent
      {...containerProps}
      className={cx(
        { "sortable-container": !disabled, "sortable-container-dragging": isDragging },
        containerProps.className
      )}
    >
      {children}
    </ContainerComponent>
  );

  if (disabled) {
    return container;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={modifiers}
      onDragStart={() => setIsDragging(true)}
      onDragCancel={() => setIsDragging(false)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={axis === "xy" ? rectSortingStrategy : verticalListSortingStrategy}>
        <HelperClassContext.Provider value={helperClass}>{container}</HelperClassContext.Provider>
      </SortableContext>
    </DndContext>
  );
}
