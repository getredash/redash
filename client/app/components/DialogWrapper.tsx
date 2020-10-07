import { map, merge, filter, each } from "lodash";
import React, { useState, useImperativeHandle, useEffect, useMemo, useRef } from "react";
import { ModalProps } from "antd/lib/modal/Modal";
import PropTypes from "prop-types";

export const DialogPropType = PropTypes.shape({
  props: PropTypes.shape({
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    afterClose: PropTypes.func,
  }).isRequired,
  close: PropTypes.func.isRequired,
  dismiss: PropTypes.func.isRequired,
});

type CloseDialogHandler<ROk> = (result?: ROk) => Promise<ROk> | ROk;
type DismissDialogHandler<RCancel> = (result?: RCancel) => Promise<RCancel> | RCancel;

export type InternalDialogInstance<ROk, RCancel> = {
  host: DialogHostInstance;
  props: ModalProps;
  close: (result: ROk) => void;
  dismiss: (result: RCancel) => void;
};

export interface ExternalDialogInstance<P, ROk, RCancel> {
  host: DialogHostInstance;
  update: (props: P) => void;
  onClose: (handler: CloseDialogHandler<ROk>) => this;
  onDismiss: (handler: DismissDialogHandler<RCancel>) => this;
  close: (result: ROk) => void;
  dismiss: (result: RCancel) => void;
}

export type DialogComponentProps<P, ROk, RCancel> = { dialog: InternalDialogInstance<ROk, RCancel> } & P;

export type DialogComponent<P, ROk, RCancel> = React.ComponentType<DialogComponentProps<P, ROk, RCancel>>;

class DialogHostItem<P, ROk, RCancel> {
  key: string;
  Component: DialogComponent<P, ROk, RCancel>;
  props: P;
  closeHandler?: CloseDialogHandler<ROk>;
  dismissHandler?: DismissDialogHandler<RCancel>;
  internalInstance: InternalDialogInstance<ROk, RCancel>;
  externalInstance: ExternalDialogInstance<P, ROk, RCancel>;

  constructor(host: DialogHostInstance, Component: DialogComponent<P, ROk, RCancel>, props: P) {
    let pendingCloseTask: Promise<ROk | RCancel> | null = null;

    const processDialogClose = (result: any, additionalDialogProps: any): Promise<any> => {
      this.internalInstance.props = merge(this.internalInstance.props, {
        okButtonProps: { disabled: true },
        cancelButtonProps: { disabled: true },
      }, additionalDialogProps);
      host.changed();

      return Promise.resolve(result)
        .then((data) => {
          this.internalInstance.props.visible = false;
          return data;
        })
        .finally(() => {
          this.internalInstance.props.okButtonProps = {};
          this.internalInstance.props.cancelButtonProps = {};
          host.changed();
        });
    }

    const closeDialog = (result?: ROk): Promise<any> => {
      if (!pendingCloseTask) {
        pendingCloseTask = processDialogClose(this.closeHandler?.(result), {
          okButtonProps: { loading: true }
        }).finally(() => {
          pendingCloseTask = null;
        });
      }
      return pendingCloseTask;
    };

    const dismissDialog = (result?: RCancel): Promise<any> => {
      if (!pendingCloseTask) {
        pendingCloseTask = processDialogClose(this.dismissHandler?.(result), {
          cancelButtonProps: { loading: true },
        }).finally(() => {
          pendingCloseTask = null;
        });
      }
      return pendingCloseTask;
    };

    this.key = Math.random()
      .toString(32)
      .substr(2);
    this.Component = Component;
    this.props = props;

    this.internalInstance = {
      host,
      props: {
        visible: true,
        okButtonProps: {},
        cancelButtonProps: {},
        onOk: () => closeDialog(),
        onCancel: () => dismissDialog(),
        afterClose: () => host.destroyDialog(this),
      },
      close: closeDialog,
      dismiss: dismissDialog,
    };

    this.externalInstance = {
      host,
      update: (newProps: P) => {
        this.props = { ...this.props, ...newProps };
        host.changed();
      },
      onClose: (handler: CloseDialogHandler<ROk>) => {
        this.closeHandler = handler;
        return this.externalInstance;
      },
      onDismiss: (handler: DismissDialogHandler<RCancel>) => {
        this.dismissHandler = handler;
        return this.externalInstance;
      },
      close: closeDialog,
      dismiss: dismissDialog,
    }
  }
}

class DialogHostInstance {
  #items: DialogHostItem<any, any, any>[] = [];
  readonly #onChange: (items: DialogHostItem<any, any, any>[]) => void;

  constructor(onChange: (items: DialogHostItem<any, any, any>[]) => void) {
    this.#onChange = onChange;
  }

  changed() {
    this.#onChange([...this.#items]);
  }

  destroyDialog<P, ROk, RCancel>(dialog: DialogHostItem<P, ROk, RCancel>) {
    this.#items = filter(this.#items, item => item.key !== dialog.key);
    this.changed();
  }

  dismissAll<RCancel>(result: RCancel) {
    each(this.#items, item => {
      item.externalInstance.dismiss(result);
    });
  }

  showModal<P, ROk, RCancel>(Component: DialogComponent<P, ROk, RCancel>, props: P) {
    const item = new DialogHostItem<P, ROk, RCancel>(this, Component, props);
    this.#items.push(item);
    this.changed();
    return item.externalInstance;
  }
}

let defaultDialogHost: DialogHostInstance | undefined;

export const DialogHost = React.forwardRef(function DialogHost(props, ref): JSX.Element {
  const [items, setItems] = useState<DialogHostItem<any, any, any>[]>([]);
  const isComponentDestroyedRef = useRef<boolean>(false);

  const instance = useMemo(() => new DialogHostInstance((newItems: DialogHostItem<any, any, any>[]) => {
    if (!isComponentDestroyedRef.current) {
      setItems(newItems);
    }
  }), []);

  useImperativeHandle(ref, () => instance, [instance]);

  useEffect(() => {
    return () => {
      isComponentDestroyedRef.current = true;
      instance.dismissAll(new Error("Dialog host destroyed."));
    };
  }, [instance]);

  return (
    <React.Fragment>
      {map(items, ({ key, Component, props, internalInstance }) => (
        <Component key={key} dialog={internalInstance} {...props} />
      ))}
    </React.Fragment>
  );
});

export const DefaultDialogHost = React.forwardRef(function DefaultDialogHost(props, ref): JSX.Element {
  const [innerRef, setInnerRef] = useState<DialogHostInstance | undefined>();

  useImperativeHandle(ref, () => innerRef, [innerRef]);

  useEffect(() => {
    defaultDialogHost = innerRef;
  }, [innerRef]);

  return <DialogHost ref={setInnerRef} />
});

export function wrap<P, ROk, RCancel>(Component: DialogComponent<P, ROk, RCancel>) {
  type DialogComponentPropsEx = P & { host?: DialogHostInstance };

  return {
    Component,
    showModal: (props: DialogComponentPropsEx, host?: DialogHostInstance): ExternalDialogInstance<P, ROk, RCancel> => {
      host = host || defaultDialogHost;
      if (!host) {
        throw new Error("No host provided for dialog");
      }
      return host.showModal(Component, props);
    },
  };
}

export default {
  DialogPropType,
  wrap,
};
