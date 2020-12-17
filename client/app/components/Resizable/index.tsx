import d3 from "d3";
import React, { useRef, useMemo, useCallback, useState, useEffect } from "react";
import { Resizable as ReactResizable } from "react-resizable";
import KeyboardShortcuts from "@/services/KeyboardShortcuts";
import "./index.less";
type OwnProps = {
    direction?: "horizontal" | "vertical";
    sizeAttribute?: string;
    toggleShortcut?: string;
    children?: React.ReactElement;
};
type Props = OwnProps & typeof Resizable.defaultProps;
export default function Resizable({ toggleShortcut, direction, sizeAttribute, children }: Props) {
    const [size, setSize] = useState(0);
    const elementRef = useRef();
    const wasUsingTouchEventsRef = useRef(false);
    const wasResizedRef = useRef(false);
    const sizeProp = direction === "horizontal" ? "width" : "height";
    sizeAttribute = sizeAttribute || sizeProp;
    const getElementSize = useCallback(() => {
        if (!elementRef.current) {
            return 0;
        }
        // @ts-expect-error ts-migrate(2532) FIXME: Object is possibly 'undefined'.
        return Math.floor(elementRef.current.getBoundingClientRect()[sizeProp]);
    }, [sizeProp]);
    const savedSize = useRef(null);
    const toggle = useCallback(() => {
        if (!elementRef.current) {
            return;
        }
        // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
        const element = d3.select(elementRef.current);
        let targetSize;
        if (savedSize.current === null) {
            targetSize = "0px";
            // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'null'.
            savedSize.current = `${getElementSize()}px`;
        }
        else {
            targetSize = savedSize.current;
            savedSize.current = null;
        }
        element
            .style(sizeAttribute, savedSize.current || "0px")
            .transition()
            .duration(200)
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            .ease("swing")
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            .style(sizeAttribute, targetSize);
        // update state to new element's size
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string | null' is not assignable... Remove this comment to see the full error message
        setSize(parseInt(targetSize) || 0);
    }, [getElementSize, sizeAttribute]);
    const resizeHandle = useMemo(() => (<span className={`react-resizable-handle react-resizable-handle-${direction}`} onClick={() => {
        // On desktops resize uses `mousedown`/`mousemove`/`mouseup` events, and there is a conflict
        // with this `click` handler: after user releases mouse - this handler will be executed.
        // So we use `wasResized` flag to check if there was actual resize or user just pressed and released
        // left mouse button (see also resize event handlers where ths flag is set).
        // On mobile devices `touchstart`/`touchend` events wll be used, so it's safe to just execute this handler.
        // To detect which set of events was actually used during particular resize operation, we pass
        // `onMouseDown` handler to draggable core and check event type there (see also that handler's code).
        if (wasUsingTouchEventsRef.current || !wasResizedRef.current) {
            toggle();
        }
        wasUsingTouchEventsRef.current = false;
        wasResizedRef.current = false;
    }}/>), [direction, toggle]);
    useEffect(() => {
        if (toggleShortcut) {
            const shortcuts = {
                [toggleShortcut]: toggle,
            };
            KeyboardShortcuts.bind(shortcuts);
            return () => {
                KeyboardShortcuts.unbind(shortcuts);
            };
        }
    }, [toggleShortcut, toggle]);
    const resizeEventHandlers = useMemo(() => ({
        onResizeStart: () => {
            // use element's size as initial value (it will also check constraints set in CSS)
            // updated here and in `draggableCore::onMouseDown` handler to ensure that right value will be used
            setSize(getElementSize());
        },
        onResize: (unused: any, data: any) => {
            // update element directly for better UI responsiveness
            // @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call.
            d3.select(elementRef.current).style(sizeAttribute, `${data.size[sizeProp]}px`);
            setSize(data.size[sizeProp]);
            wasResizedRef.current = true;
        },
        onResizeStop: () => {
            if (wasResizedRef.current) {
                savedSize.current = null;
            }
        },
    }), [sizeProp, getElementSize, sizeAttribute]);
    const draggableCoreOptions = useMemo(() => ({
        onMouseDown: (e: any) => {
            // In some cases this handler is executed twice during the same resize operation - first time
            // with `touchstart` event and second time with `mousedown` (probably emulated by browser).
            // Therefore we set the flag only when we receive `touchstart` because in ths case it's definitely
            // mobile browser (desktop browsers will also send `mousedown` but never `touchstart`).
            if (e.type === "touchstart") {
                wasUsingTouchEventsRef.current = true;
            }
            // use element's size as initial value (it will also check constraints set in CSS)
            // updated here and in `onResizeStart` handler to ensure that right value will be used
            setSize(getElementSize());
        },
    }), [getElementSize]);
    if (!children) {
        return null;
    }
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'CElement<any, Component<any, any, any>>' is ... Remove this comment to see the full error message
    children = React.createElement((children as any).type, { ...(children as any).props, ref: elementRef });
    return (<ReactResizable className="resizable-component" axis={direction === "horizontal" ? "x" : "y"} resizeHandles={[direction === "horizontal" ? "e" : "s"]} handle={resizeHandle} width={direction === "horizontal" ? size : 0} height={direction === "vertical" ? size : 0} minConstraints={[0, 0]} {...resizeEventHandlers} draggableOpts={draggableCoreOptions}>
      {children}
    </ReactResizable>);
}
Resizable.defaultProps = {
    direction: "horizontal",
    sizeAttribute: null,
    toggleShortcut: null,
    children: null,
};
