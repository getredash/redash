import { extend, map, merge, omit, filter, each, identity } from "lodash";
import React, {useState, useImperativeHandle, useEffect, useMemo, useRef, useContext, PropsWithChildren} from "react";
import { ModalProps } from "antd/lib/modal/Modal";
import PropTypes from "prop-types";

/**
  How to:
  =======

  Use a dialog?
  -------------

  Wrapped dialog is an object which implements OuterDialogInterface. To open a dialog, simply
  use its `.showModal()` method and pass dialog props and dialog host:

  import MyDialog from "...";

  MyDialog.showModal({ greeting: "Hello, World!" });

  Obtain a dialog host instance?
  ------------------------------

  Host instances are provided by DialogHost and DefaultDialogHost components.
  So you basically can obtain a ref to that components and pass it to `.showModal()`.
  You can (and probably that's a good idea) wrap the whole app with a `<DefaultDialogHost>...</DefaultDialogHost>` -
  in this case you can call `.showModal()` without second argument - it will use the default host.
  **Note:** use the only instance of DefaultDialogHost, otherwise it will lead to undefined behavior.

  Also, each DialogHost component provides self instance to its children via DialogHostContext. There are two
  helper hooks that can obtain this instance:

  - useParentDialogHost() - will return a DialogHost instance if there is any among component's parents;
  - useDialogHost() - same as useParentDialogHost, but will fallback to a default host instance.

  If you already have a dialog instance (either InnerDialogInterface in a dialog component or OuterDialogInterface
  returned by `.showModal()` - you can use it's `.host` property to show other dialogs.

  Create a dialog?
  ----------------

  1. Add imports:

  import { wrap as wrapDialog, DialogComponentProps } from 'path/to/DialogWrapper';

  2. define a `dialog` property on your component:

  function MyDialog({ dialog }: DialogComponentProps<...>) {
    ...
  }

  `dialog` property is an instance of InnerDialogInterface

  3. expand additional properties on <Modal> component:

  function MyDialog(...) {
    return (
      <Modal {...dialog.props}>
    );
  }

  4. wrap your component and export it:

  export default wrapDialog(MyDialog).

  Your component is ready to use. Wrapper will manage <Modal>'s visibility and events.
  If you want to override behavior of `onOk`/`onCancel` - don't forget to close dialog:

  function MyDialog(...) {
    function customOkHandler() {
      saveData().then(() => {
        dialog.close({ success: true }); // or dismiss();
      });
    }

    return (
      <Modal {...dialog.props} onOk={customOkHandler}>
    );
  }
*/

type Result<R> = R | Promise<R | undefined>;

type CloseDialogHandler<ROk> = (result?: Result<ROk>) => Result<ROk>;
type DismissDialogHandler<RCancel> = (result?: Result<RCancel>) => Result<RCancel>;

// Instance passed to dialog itself
export interface InnerDialogInterface<ROk, RCancel> {
  host: DialogHostInterface;
  props: ModalProps;
  close(result: Result<ROk>): Promise<ROk | undefined>;
  dismiss(result: Result<RCancel>): Promise<RCancel | undefined>;
}

// Instance returned by `.showModal()`
export interface OuterDialogInterface<P, ROk, RCancel> {
  host: DialogHostInterface;
  update(props: P): void;
  close(result: Result<ROk>): Promise<ROk | undefined>;
  dismiss(result: Result<RCancel>): Promise<RCancel | undefined>;
  onClose(handler: CloseDialogHandler<ROk>): this;
  onDismiss(handler: DismissDialogHandler<RCancel>): this;
}

class DialogInstance<P, ROk, RCancel> implements OuterDialogInterface<P, ROk, RCancel> {
  readonly key = Math.random().toString(32).substr(2);

  readonly #Component: DialogComponent<P, ROk, RCancel>;
  #componentProps: P;
  #dialog: InnerDialogInterface<ROk, RCancel>;

  #closeHandler: CloseDialogHandler<ROk> = identity;
  #dismissHandler: DismissDialogHandler<RCancel> = identity;
  #pendingCloseTask: Promise<any> | null = null;

  readonly host: DialogHostInstance;

  readonly update: (props: P) => void = (props) => {
    this.#componentProps = extend({}, this.#componentProps, props);
    this.host.changed();
  };

  readonly onClose = (handler: CloseDialogHandler<ROk>): this => {
    this.#closeHandler = handler || identity;
    return this;
  };

  readonly onDismiss = (handler: DismissDialogHandler<RCancel>): this => {
    this.#dismissHandler = handler || identity;
    return this;
  };

  readonly #updateDialogProps = (updater: (props: ModalProps) => ModalProps): void => {
    this.#dialog = {
      ...this.#dialog,
      props: updater(this.#dialog.props),
    };
  }

  readonly #processDialogClose: <R>(result: Result<R>, dialogProps: ModalProps) => Promise<R> = (result, dialogProps) => {
    if (!this.#pendingCloseTask) {
      this.#updateDialogProps(props => merge({
        ...props,
        closable: false,
        maskClosable: false,
        okButtonProps: {disabled: true},
        cancelButtonProps: {disabled: true},
      }, dialogProps));
      this.host.changed();

      this.#pendingCloseTask = Promise.resolve(result)
        .then((data) => {
          this.#updateDialogProps(props => ({ ...props, visible: false }));
          return data;
        })
        .finally(() => {
          this.#updateDialogProps(props => omit({ ...props, okButtonProps: {}, cancelButtonProps: {} }, ["closable", "maskClosable"]));
          this.host.changed();
          this.#pendingCloseTask = null;
        });
    }
    return this.#pendingCloseTask;
  };

  readonly close = (result?: Result<ROk>): Promise<ROk | undefined> => {
    return this.#processDialogClose(this.#closeHandler(result), {
      okButtonProps: { loading: true }
    });
  };

  readonly dismiss = (result?: Result<RCancel>): Promise<RCancel | undefined> => {
    return this.#processDialogClose(this.#dismissHandler(result), {
      cancelButtonProps: { loading: true }
    });
  }

  constructor(host: DialogHostInstance, Component: DialogComponent<P, ROk, RCancel>, props?: P) {
    this.host = host;
    this.#Component = Component;
    this.#componentProps = extend({}, props);

    this.#dialog = {
      host,
      props: {
        visible: true,
        okButtonProps: {},
        cancelButtonProps: {},
        onOk: () => this.close(),
        onCancel: () => this.dismiss(),
        afterClose: () => host.destroyDialog(this),
      },
      close: this.close,
      dismiss: this.dismiss,
    };
  }

  render() {
    const Component = this.#Component;
    return <Component key={this.key} dialog={this.#dialog} {...this.#componentProps} />
  }
}

export interface DialogHostInterface {
  showModal<P, ROk, RCancel>(Component: DialogComponent<P, ROk, RCancel>, props?: P): OuterDialogInterface<P, ROk, RCancel>;
}

class DialogHostInstance implements DialogHostInterface {
  #items: DialogInstance<any, any, any>[] = [];
  readonly #onChange: (items: DialogInstance<any, any, any>[]) => void;

  constructor(onChange: (items: DialogInstance<any, any, any>[]) => void) {
    this.#onChange = onChange;
  }

  changed() {
    this.#onChange([...this.#items]);
  }

  destroyDialog<P, ROk, RCancel>(dialog: DialogInstance<P, ROk, RCancel>) {
    this.#items = filter(this.#items, item => item.key !== dialog.key);
    this.changed();
  }

  dismissAll<RCancel>(result: RCancel) {
    each(this.#items, item => {
      item.dismiss(result);
    });
  }

  showModal<P, ROk, RCancel>(Component: DialogComponent<P, ROk, RCancel>, props?: P): OuterDialogInterface<P, ROk, RCancel> {
    const item = new DialogInstance<P, ROk, RCancel>(this, Component, props);
    this.#items.push(item);
    this.changed();
    return item;
  }
}

export type DialogComponentProps<P, ROk, RCancel> = { dialog: InnerDialogInterface<ROk, RCancel> } & P;

export type DialogComponent<P, ROk, RCancel> = React.ComponentType<DialogComponentProps<P, ROk, RCancel>>;

let defaultDialogHost: DialogHostInterface | null;

export const DialogHostContext = React.createContext<DialogHostInterface | null>(null);

export function useParentDialogHost(): DialogHostInterface | null {
  return useContext(DialogHostContext);
}

export function useDialogHost(): DialogHostInterface | null {
  return useContext(DialogHostContext) || defaultDialogHost;
}

type DialogHostProps = PropsWithChildren<{}>;
type DialogHostRef = DialogHostInterface | null;

export const DialogHost = React.forwardRef<DialogHostRef, DialogHostProps>(function DialogHost({ children }, ref) {
  const [items, setItems] = useState<DialogInstance<any, any, any>[]>([]);
  const isComponentDestroyedRef = useRef<boolean>(false);

  const instance = useMemo(() => new DialogHostInstance((newItems: DialogInstance<any, any, any>[]) => {
    if (!isComponentDestroyedRef.current) {
      setItems(newItems);
    }
  }), []);

  useImperativeHandle<DialogHostRef, DialogHostInterface>(ref, () => instance, [instance]);

  useEffect(() => {
    return () => {
      isComponentDestroyedRef.current = true;
      instance.dismissAll(new Error("Dialog host destroyed."));
    };
  }, [instance]);

  return (
    <React.Fragment>
      <DialogHostContext.Provider value={instance}>
        {children}
      </DialogHostContext.Provider>
      {map(items, item => item.render())}
    </React.Fragment>
  );
});

export const DefaultDialogHost = React.forwardRef<DialogHostRef, DialogHostProps>(function DefaultDialogHost({ children }, ref) {
  const [innerRef, setInnerRef] = useState<DialogHostRef>(null);

  useImperativeHandle<DialogHostRef, DialogHostRef>(ref, () => innerRef, [innerRef]);

  useEffect(() => {
    defaultDialogHost = innerRef;
  }, [innerRef]);

  return <DialogHost ref={setInnerRef}>{children}</DialogHost>;
});

export function wrap<P, ROk, RCancel>(Component: DialogComponent<P, ROk, RCancel>) {
  type DialogComponentPropsEx = P & { host?: DialogHostInterface };

  return {
    Component,
    showModal: (props?: DialogComponentPropsEx, host?: DialogHostInterface): OuterDialogInterface<P, ROk, RCancel> => {
      host = host || defaultDialogHost || undefined;
      if (!host) {
        throw new Error("No host provided for dialog");
      }
      return host.showModal(Component, props);
    },
  };
}

// InnerDialogInterface as a proptype
export const DialogPropType = PropTypes.shape({
  host: PropTypes.object.isRequired,
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
