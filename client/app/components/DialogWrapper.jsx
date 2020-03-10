import { isFunction } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";

/**
  Wrapper for dialogs based on Ant's <Modal> component.


  Using wrapped dialogs
  =====================

  Wrapped component is an object with two fields:

    {
      showModal: (dialogProps) => object({
          result: Promise,
          close: (result) => void,
          dismiss: (reason) => void,
        }),
      Component: React.Component, // wrapped dialog component
    }

  To open dialog, use `showModal` method; optionally you can pass additional properties that
  will be expanded on wrapped component:

    const dialog = SomeWrappedDialog.showModal()

    const dialog = SomeWrappedDialog.showModal({ greeting: 'Hello' })

  To get result of modal, use `result` property:

    dialog.result
      .then(...) // pressed OK button or used `close` method; resolved value is a result of dialog
      .catch(...) // pressed Cancel button or used `dismiss` method; optional argument is a rejection reason.

  Also, dialog has `close` and `dismiss` methods that allows to close dialog by caller. Passed arguments
  will be used to resolve/reject `dialog.result` promise. `update` methods allows to pass new properties
  to dialog.


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

  4. wrap your component and export it:

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


  Settings
  ========

  You can setup this wrapper to use custom `Promise` library (for example, Bluebird):

    import DialogWrapper from 'path/to/DialogWrapper';
    import Promise from 'bluebird';

    DialogWrapper.Promise = Promise;

  It could be useful to avoid `unhandledrejection` exception that would fire with native Promises,
  or when some custom Promise library is used in application.

*/

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

// default export of module
const DialogWrapper = {
  Promise,
  DialogPropType,
  wrap() {},
};

function openDialog(DialogComponent, props) {
  const dialog = {
    props: {
      visible: true,
      onOk: () => {},
      onCancel: () => {},
      afterClose: () => {},
    },
    close: () => {},
    dismiss: () => {},
  };

  const dialogResult = {
    resolve: () => {},
    reject: () => {},
  };

  const container = document.createElement("div");
  document.body.appendChild(container);

  function render() {
    ReactDOM.render(<DialogComponent {...props} dialog={dialog} />, container);
  }

  function destroyDialog() {
    // Allow calling chain to roll up, and then destroy component
    setTimeout(() => {
      ReactDOM.unmountComponentAtNode(container);
      document.body.removeChild(container);
    }, 10);
  }

  function closeDialog(result) {
    dialogResult.resolve(result);
    dialog.props.visible = false;
    render();
  }

  function dismissDialog(reason) {
    dialogResult.reject(reason);
    dialog.props.visible = false;
    render();
  }

  dialog.props.onOk = closeDialog;
  dialog.props.onCancel = dismissDialog;
  dialog.props.afterClose = destroyDialog;
  dialog.close = closeDialog;
  dialog.dismiss = dismissDialog;

  const result = {
    close: closeDialog,
    dismiss: dismissDialog,
    update: newProps => {
      props = { ...props, ...newProps };
      render();
    },
    result: new DialogWrapper.Promise((resolve, reject) => {
      dialogResult.resolve = resolve;
      dialogResult.reject = reject;
    }),
  };

  render(); // show it only when all structures initialized to avoid unnecessary re-rendering

  // Some known libraries support
  // Bluebird: http://bluebirdjs.com/docs/api/suppressunhandledrejections.html
  if (isFunction(result.result.suppressUnhandledRejections)) {
    result.result.suppressUnhandledRejections();
  }

  return result;
}

export function wrap(DialogComponent) {
  return {
    Component: DialogComponent,
    showModal: props => openDialog(DialogComponent, props),
  };
}

DialogWrapper.wrap = wrap;

export default DialogWrapper;
