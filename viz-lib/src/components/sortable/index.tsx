import React, { createContext, useContext, useMemo, useState } from "react";
import cx from "classnames";
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { UniqueIdentifier } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToHorizontalAxis, restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";

import "./style.less";

type SortableContainerContextValue = {
  useDragHandle: boolean;
  activeId: UniqueIdentifier | null;
  helperClass?: string;
  disabled: boolean;
};

const SortableContainerContext = createContext<SortableContainerContextValue | null>(null);

type SortableItemContextValue = {
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  listeners?: Record<string, any>;
  attributes?: Record<string, any>;
  useDragHandle: boolean;
};

const SortableItemContext = createContext<SortableItemContextValue | null>(null);

export const DragHandle = ({ className, ...restProps }: any) => {
  const context = useContext(SortableItemContext);
  if (!context || !context.useDragHandle) {
    return <div className={cx("drag-handle", className)} {...restProps} />;
  }

  const { setActivatorNodeRef, listeners, attributes } = context;
  return (
    <div
      className={cx("drag-handle", className)}
      {...restProps}
      {...attributes}
      {...listeners}
      ref={setActivatorNodeRef}
    />
  );
};

export const SortableContainerWrapper = ({ children }: any) => <>{children}</>;

type SortableElementProps = {
  id: UniqueIdentifier;
  index?: number;
  as?: React.ElementType;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export function SortableElement({ id, as, disabled, className, style, children, ...restProps }: SortableElementProps) {
  const containerContext = useContext(SortableContainerContext);
  const containerDisabled = containerContext?.disabled ?? false;
  const useDragHandle = containerContext?.useDragHandle ?? false;
  const helperClass = containerContext?.helperClass;
  const activeId = containerContext?.activeId;

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id,
    disabled: containerDisabled || Boolean(disabled),
  });

  const Component: any = as || "div";
  const resolvedClassName = cx(className, helperClass && activeId === id && helperClass);
  const resolvedStyle = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const rootDragProps = useDragHandle ? {} : { ...attributes, ...listeners };

  return (
    <SortableItemContext.Provider value={{ setActivatorNodeRef, listeners, attributes, useDragHandle }}>
      <Component ref={setNodeRef} className={resolvedClassName} style={resolvedStyle} {...rootDragProps} {...restProps}>
        {children}
      </Component>
    </SortableItemContext.Provider>
  );
}

type SortableContainerProps = {
  disabled?: boolean;
  containerComponent?: React.ElementType;
  containerProps?: any;
  children?: React.ReactNode;
  items?: UniqueIdentifier[];
  useDragHandle?: boolean;
  axis?: "x" | "y" | "xy";
  lockAxis?: "x" | "y";
  lockToContainerEdges?: boolean;
  helperClass?: string;
  helperContainer?: (container: any) => any;
  updateBeforeSortStart?: (event: any) => void;
  onSortStart?: (event: any) => void;
  onSortEnd?: ({ oldIndex, newIndex }: { oldIndex: number; newIndex: number }) => void;
};

export function SortableContainer({
  disabled: disabled = false,
  containerComponent: containerComponent = "div",
  containerProps: containerProps = {},
  children: children = null,
  items: itemsProp,
  useDragHandle: useDragHandle = false,
  axis,
  lockAxis,
  lockToContainerEdges,
  helperClass,
  helperContainer,
  updateBeforeSortStart,
  onSortStart,
  onSortEnd,
}: SortableContainerProps) {
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const items = useMemo(() => {
    if (itemsProp) {
      return itemsProp;
    }
    return React.Children.toArray(children)
      .map(child => (React.isValidElement(child) ? (child.props as any).id : null))
      .filter(Boolean) as UniqueIdentifier[];
  }, [itemsProp, children]);

  const modifiers = useMemo(() => {
    const result = [];
    if (lockAxis === "x" || axis === "x") {
      result.push(restrictToHorizontalAxis);
    }
    if (lockAxis === "y" || axis === "y") {
      result.push(restrictToVerticalAxis);
    }
    if (lockToContainerEdges) {
      result.push(restrictToParentElement);
    }
    return result;
  }, [axis, lockAxis, lockToContainerEdges]);

  const strategy = useMemo(() => {
    if (axis === "y" || lockAxis === "y") {
      return verticalListSortingStrategy;
    }
    if (axis === "x" || lockAxis === "x") {
      return horizontalListSortingStrategy;
    }
    return rectSortingStrategy;
  }, [axis, lockAxis]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const handleDragStart = (event: any) => {
    if (disabled) {
      return;
    }
    setActiveId(event.active?.id ?? null);
    setIsDragging(true);
    if (typeof updateBeforeSortStart === "function") {
      updateBeforeSortStart(event);
    }
    if (typeof onSortStart === "function") {
      onSortStart(event);
    }
  };

  const handleDragEnd = (event: any) => {
    setIsDragging(false);
    setActiveId(null);
    if (!event?.over || typeof onSortEnd !== "function") {
      return;
    }
    const oldIndex = items.indexOf(event.active.id);
    const newIndex = items.indexOf(event.over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onSortEnd({ oldIndex, newIndex });
    }
  };

  const handleDragCancel = () => {
    setIsDragging(false);
    setActiveId(null);
  };

  const ContainerComponent: any = containerComponent || "div";
  const resolvedContainerProps = {
    ...containerProps,
    className: cx(
      "sortable-container",
      { "sortable-container-dragging": isDragging },
      containerProps?.className
    ),
  };

  return (
    <SortableContainerWrapper>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={modifiers}>
        <SortableContext items={items} strategy={strategy}>
          <SortableContainerContext.Provider
            value={{ useDragHandle: Boolean(useDragHandle), activeId, helperClass, disabled: Boolean(disabled) }}>
            <ContainerComponent {...resolvedContainerProps}>{children}</ContainerComponent>
          </SortableContainerContext.Provider>
        </SortableContext>
      </DndContext>
    </SortableContainerWrapper>
  );
}
