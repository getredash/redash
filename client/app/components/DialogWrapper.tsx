import { map, merge, omit, filter, each, identity } from "lodash";
import React, { useState, useImperativeHandle, useEffect, useMemo, useRef } from "react";
import { ModalProps } from "antd/lib/modal/Modal";
import PropTypes from "prop-types";

type Result<R> = R | Promise<R | undefined>;

type CloseDialogHandler<ROk> = (result?: Result<ROk>) => Result<ROk>;
type DismissDialogHandler<RCancel> = (result?: Result<RCancel>) => Result<RCancel>;

interface BaseDialogInterface<ROk, RCancel> {
  host: DialogHostInstance;
  close(result: Result<ROk>): Promise<ROk | undefined>;
  dismiss(result: Result<RCancel>): Promise<RCancel | undefined>;
}

export interface InternalDialogInstance<ROk, RCancel> extends BaseDialogInterface<ROk, RCancel> {
  props: ModalProps;
}

export interface ExternalDialogInstance<P, ROk, RCancel> extends BaseDialogInterface<ROk, RCancel> {
  update(props: P): void;
  onClose(handler: CloseDialogHandler<ROk>): this;
  onDismiss(handler: DismissDialogHandler<RCancel>): this;
}

export type DialogComponentProps<P, ROk, RCancel> = { dialog: InternalDialogInstance<ROk, RCancel> } & P;

export type DialogComponent<P, ROk, RCancel> = React.ComponentType<DialogComponentProps<P, ROk, RCancel>>;

class DialogHostItem<P, ROk, RCancel> {
  readonly key: string;
  readonly #host: DialogHostInstance;
  readonly #Component: DialogComponent<P, ROk, RCancel>;
  #componentProps: P;
  #closeHandler: CloseDialogHandler<ROk> = identity;
  #dismissHandler: DismissDialogHandler<RCancel> = identity;

  internalInstance: InternalDialogInstance<ROk, RCancel>;
  externalInstance: ExternalDialogInstance<P, ROk, RCancel>;

  #pendingCloseTask: Promise<any> | null = null;

  readonly #updateDialogProps = (updater: (props: ModalProps) => ModalProps): void => {
    this.internalInstance = {
      ...this.internalInstance,
      props: updater(this.internalInstance.props),
    };
  }

  processDialogClose<R>(result: Result<R>, additionalDialogProps: ModalProps): Promise<R> {
    if (!this.#pendingCloseTask) {
      this.#updateDialogProps(props => merge({
        ...props,
        closable: false,
        maskClosable: false,
        okButtonProps: {disabled: true},
        cancelButtonProps: {disabled: true},
      }, additionalDialogProps));
      this.#host.changed();

      this.#pendingCloseTask = Promise.resolve(result)
        .then((data) => {
          this.#updateDialogProps(props => ({ ...props, visible: false }));
          return data;
        })
        .finally(() => {
          this.#updateDialogProps(props => omit({ ...props, okButtonProps: {}, cancelButtonProps: {} }, ["closable", "maskClosable"]));
          this.#host.changed();
          this.#pendingCloseTask = null;
        });
    }
    return this.#pendingCloseTask;
  }

  readonly closeDialog = (result?: Result<ROk>): Promise<ROk | undefined> => {
    return this.processDialogClose(this.#closeHandler(result), {
      okButtonProps: { loading: true }
    });
  };

  readonly dismissDialog = (result?: Result<RCancel>): Promise<RCancel | undefined> => {
    return this.processDialogClose(this.#dismissHandler(result), {
      cancelButtonProps: { loading: true }
    });
  }

  constructor(host: DialogHostInstance, Component: DialogComponent<P, ROk, RCancel>, props: P) {
    this.key = Math.random()
      .toString(32)
      .substr(2);
    this.#host = host;
    this.#Component = Component;
    this.#componentProps = props;

    this.internalInstance = {
      host,
      props: {
        visible: true,
        okButtonProps: {},
        cancelButtonProps: {},
        onOk: () => this.closeDialog(),
        onCancel: () => this.dismissDialog(),
        afterClose: () => host.destroyDialog(this),
      },
      close: this.closeDialog,
      dismiss: this.dismissDialog,
    };

    this.externalInstance = {
      host,
      update: (newProps: P) => {
        this.#componentProps = { ...this.#componentProps, ...newProps };
        host.changed();
      },
      onClose: (handler: CloseDialogHandler<ROk>) => {
        this.#closeHandler = handler || identity;
        return this.externalInstance;
      },
      onDismiss: (handler: DismissDialogHandler<RCancel>) => {
        this.#dismissHandler = handler || identity;
        return this.externalInstance;
      },
      close: this.closeDialog,
      dismiss: this.dismissDialog,
    }
  }

  render() {
    const Component = this.#Component;
    return <Component key={this.key} dialog={this.internalInstance} {...this.#componentProps} />
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
      {map(items, item => item.render())}
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

// InternalDialogInstance as a prop-type
export const DialogPropType = PropTypes.shape({
  host: PropTypes.instanceOf(DialogHostInstance).isRequired,
  props: PropTypes.shape({
    visible: PropTypes.bool,
    onOk: PropTypes.func,
    onCancel: PropTypes.func,
    afterClose: PropTypes.func,
  }).isRequired,
  close: PropTypes.func.isRequired,
  dismiss: PropTypes.func.isRequired,
});

export default {
  DialogPropType,
  wrap,
};
