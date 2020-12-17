import { isFunction } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
type DialogPropType = {
    props: {
        visible?: boolean;
        onOk?: (...args: any[]) => any;
        onCancel?: (...args: any[]) => any;
        afterClose?: (...args: any[]) => any;
    };
    close: (...args: any[]) => any;
    dismiss: (...args: any[]) => any;
};
/**
  Wrapper for dialogs based on Ant's <Modal> component.


  Using wrapped dialogs
  =====================

  Wrapped component is an object with two fields:

    {
      showModal: (dialogProps) => object({
          close: (result) => void,
          dismiss: (reason) => void,
          onClose: (handler) => this,
          onDismiss: (handler) => this,
        }),
      Component: React.Component, // wrapped dialog component
    }

  To open dialog, use `showModal` method; optionally you can pass additional properties that
  will be expanded on wrapped component:

    const dialog = SomeWrappedDialog.showModal()

    const dialog = SomeWrappedDialog.showModal({ greeting: 'Hello' })

  To get result of modal, use `onClose`/`onDismiss` setters:

    dialog
      .onClose(result => { ... }) // pressed OK button or used `close` method
      .onDismiss(result => { ... }) // pressed Cancel button or used `dismiss` method

  If `onClose`/`onDismiss` returns a promise - dialog wrapper will stop handling further close/dismiss
  requests and will show loader on a corresponding button until that promise is fulfilled (either resolved or
  rejected). If that promise will be rejected - dialog close/dismiss will be abandoned. Use promise returned
  from `close`/`dismiss` methods to handle errors (if needed).

  Also, dialog has `close` and `dismiss` methods that allows to close dialog by caller. Passed arguments
  will be passed to a corresponding handler. Both methods will return the promise returned from `onClose` and
 `onDismiss` callbacks. `update` method allows to pass new properties to dialog.


  Creating a dialog
  ================

  1. Add imports:

    import { wrap as wrapDialog, DialogPropType } from 'path/to/DialogWrapper';

  2. define a `dialog` property on your component:

    propTypes = {
      dialog: DialogPropType.isRequired,
    };

  `dialog` property is an object:

    {
      props: object, // properties for <Modal> component;
      close: (result) => void, // method to confirm dialog; `result` will be returned to caller
      dismiss: (reason) => void, // method to reject dialog; `reason` will be returned to caller
    }

  3. expand additional properties on <Modal> component:

    render() {
      const { dialog } = this.props;
      return (
        <Modal {...dialog.props}>
      );
    }

  4. wrap your component and it:

    export default wrapDialog(YourComponent).

  Your component is ready to use. Wrapper will manage <Modal>'s visibility and events.
  If you want to override behavior of `onOk`/`onCancel` - don't forget to close dialog:

    customOkHandler() {
      this.saveData().then(() => {
         this.props.dialog.close({ success: true }); // or dismiss();
      });
    }

    render() {
      const { dialog } = this.props;
        return (
          <Modal {...dialog.props} onOk={() => this.customOkHandler()}>
        );
    }
*/
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ props: Validator<In... Remove this comment to see the full error message
export const DialogPropType: PropTypes.Requireable<DialogPropType> = PropTypes.shape({
    props: PropTypes.shape({
        visible: PropTypes.bool,
        onOk: PropTypes.func,
        onCancel: PropTypes.func,
        afterClose: PropTypes.func,
    }).isRequired,
    close: PropTypes.func.isRequired,
    dismiss: PropTypes.func.isRequired,
});

function openDialog(DialogComponent: any, props: any) {
    const dialog = {
        props: {
            visible: true,
            okButtonProps: {},
            cancelButtonProps: {},
            onOk: () => { },
            onCancel: () => { },
            afterClose: () => { },
        },
        close: () => { },
        dismiss: () => { },
    };
    let pendingCloseTask: any = null;
    const handlers = {
        onClose: () => { },
        onDismiss: () => { },
    };
    const container = document.createElement("div");
    document.body.appendChild(container);
    function render() {
        ReactDOM.render(<DialogComponent {...props} dialog={dialog}/>, container);
    }
    function destroyDialog() {
        // Allow calling chain to roll up, and then destroy component
        setTimeout(() => {
            ReactDOM.unmountComponentAtNode(container);
            document.body.removeChild(container);
        }, 10);
    }
    function processDialogClose(result: any, setAdditionalDialogProps: any) {
        dialog.props.okButtonProps = { disabled: true };
        dialog.props.cancelButtonProps = { disabled: true };
        setAdditionalDialogProps();
        render();
        return Promise.resolve(result)
            .then(() => {
            dialog.props.visible = false;
        })
            .finally(() => {
            dialog.props.okButtonProps = {};
            dialog.props.cancelButtonProps = {};
            render();
        });
    }
    function closeDialog(result: any) {
        if (!pendingCloseTask) {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
            pendingCloseTask = processDialogClose(handlers.onClose(result), () => {
                (dialog.props.okButtonProps as any).loading = true;
            }).finally(() => {
                pendingCloseTask = null;
            });
        }
        return pendingCloseTask;
    }
    function dismissDialog(result: any) {
        if (!pendingCloseTask) {
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 1.
            pendingCloseTask = processDialogClose(handlers.onDismiss(result), () => {
                (dialog.props.cancelButtonProps as any).loading = true;
            }).finally(() => {
                pendingCloseTask = null;
            });
        }
        return pendingCloseTask;
    }
    // @ts-expect-error ts-migrate(2322) FIXME: Type '(result: any) => any' is not assignable to t... Remove this comment to see the full error message
    dialog.props.onOk = closeDialog;
    // @ts-expect-error ts-migrate(2322) FIXME: Type '(result: any) => any' is not assignable to t... Remove this comment to see the full error message
    dialog.props.onCancel = dismissDialog;
    dialog.props.afterClose = destroyDialog;
    // @ts-expect-error ts-migrate(2322) FIXME: Type '(result: any) => any' is not assignable to t... Remove this comment to see the full error message
    dialog.close = closeDialog;
    // @ts-expect-error ts-migrate(2322) FIXME: Type '(result: any) => any' is not assignable to t... Remove this comment to see the full error message
    dialog.dismiss = dismissDialog;
    const result = {
        close: closeDialog,
        dismiss: dismissDialog,
        update: (newProps: any) => {
            props = { ...props, ...newProps };
            render();
        },
        onClose: (handler: any) => {
            if (isFunction(handler)) {
                handlers.onClose = handler;
            }
            return result;
        },
        onDismiss: (handler: any) => {
            if (isFunction(handler)) {
                handlers.onDismiss = handler;
            }
            return result;
        },
    };
    render(); // show it only when all structures initialized to avoid unnecessary re-rendering
    return result;
}
export function wrap(DialogComponent: any) {
    return {
        Component: DialogComponent,
        showModal: (props: any) => openDialog(DialogComponent, props),
    };
}
