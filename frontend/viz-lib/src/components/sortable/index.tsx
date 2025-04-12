import { isFunction } from "lodash";
import React, { useRef, useState, useEffect } from "react";
import cx from "classnames";
import { 
  DndContext, 
  useSensor, 
  useSensors, 
  MouseSensor, 
  TouchSensor, 
  DragStartEvent, 
  DragEndEvent,
  DragOverlay,
  closestCenter,
  UniqueIdentifier 
} from "@dnd-kit/core";
import { 
  SortableContext, 
  useSortable, 
  verticalListSortingStrategy,
  horizontalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import "./style.less";

export const DragHandle = ({ className, ...restProps }: any) => (
  <div className={cx("drag-handle", className)} {...restProps} />
);

// A wrapper around the dnd-kit's useSortable hook that maintains compatibility with our code
export const SortableElement = ({ id, index, children }: any) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: id ?? index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cx("sortable-element", { "sortable-element-dragging": isDragging })}
    >
      {children}
    </div>
  );
};

type OwnProps = {
  disabled?: boolean;
  containerComponent?: any;
  containerProps?: any;
  children?: React.ReactNode;
  onSortEnd?: (params: { oldIndex: number; newIndex: number }) => void;
  onSortStart?: (event: DragStartEvent) => void;
  axis?: 'x' | 'y' | 'xy';
  lockAxis?: 'x' | 'y';
  items?: Array<UniqueIdentifier>;
};

// Define additional props that might be passed in wrapperProps
type WrapperProps = {
  onSortStart?: (event: DragStartEvent) => void;
  onSortEnd?: (event: DragEndEvent) => void;
  [key: string]: any;
};

type Props = OwnProps & typeof SortableContainer.defaultProps;

export function SortableContainer({ 
  disabled, 
  containerComponent, 
  containerProps, 
  children, 
  onSortEnd,
  onSortStart,
  axis = 'y',
  items = [],
  ...wrapperProps 
}: Props & WrapperProps) {
  const containerRef = useRef<HTMLElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  // Setup sensors for mouse and touch events
  const sensors = useSensors(
    useSensor(MouseSensor, {
      // Require the mouse to move by 10 pixels before activating
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      // Press delay of 250ms, with tolerance of 5px of movement
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  // Use the appropriate sorting strategy based on axis
  const sortingStrategy = axis === 'x' ? horizontalListSortingStrategy : verticalListSortingStrategy;

  // Helper function to determine index from id
  const getIndex = (id: UniqueIdentifier) => {
    if (typeof id === 'number') {
      return id;
    }
    return items.indexOf(id);
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    if (active) {
      setActiveId(active.id);
      setIsDragging(true);
      if (wrapperProps.onSortStart && isFunction(wrapperProps.onSortStart)) {
        wrapperProps.onSortStart(event);
      }
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onSortEnd && isFunction(onSortEnd)) {
      onSortEnd({
        oldIndex: getIndex(active.id),
        newIndex: getIndex(over.id),
      });
    }
    
    setActiveId(null);
    setIsDragging(false);
    
    if (wrapperProps.onSortEnd && isFunction(wrapperProps.onSortEnd)) {
      wrapperProps.onSortEnd(event);
    }
  };

  // Handle drag cancel
  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
  };

  // Prepare container props
  containerProps = { ...containerProps };
  if (!disabled) {
    containerProps.className = cx(
      "sortable-container",
      { "sortable-container-dragging": isDragging },
      containerProps.className
    );
    containerProps.ref = containerRef;
  }

  const ContainerComponent = containerComponent;
  
  // If disabled, just render the container without dnd context
  if (disabled) {
    return (
      <ContainerComponent {...containerProps}>
        {children}
      </ContainerComponent>
    );
  }

  // Create dummy items if none provided - we need these for SortableContext
  const dummyItems = Array.isArray(React.Children.toArray(children)) 
    ? React.Children.toArray(children).map((_, index) => index) 
    : [];
  const sortableItems = items.length > 0 ? items : dummyItems;

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableItems} strategy={sortingStrategy}>
        <ContainerComponent {...containerProps}>
          {children}
        </ContainerComponent>
      </SortableContext>
    </DndContext>
  );
}

SortableContainer.defaultProps = {
  disabled: false,
  containerComponent: "div",
  containerProps: {},
  children: null,
  axis: 'y',
  items: [],
};

SortableContainer.defaultProps = {
  disabled: false,
  containerComponent: "div",
  containerProps: {},
  children: null,
};
