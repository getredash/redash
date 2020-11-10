import { ModalProps } from "antd/lib/modal/Modal";

export interface DialogProps<ROk, RCancel> {
  props: ModalProps;
  close: (result: ROk) => void;
  dismiss: (result: RCancel) => void;
}

export type DialogWrapperChildProps<ROk, RCancel> = {
  dialog: DialogProps<ROk, RCancel>;
};

export type DialogComponentType<ROk = void, P = {}, RCancel = void> = React.ComponentType<
  DialogWrapperChildProps<ROk, RCancel> & P
>;

export function wrap<ROk = void, P = {}, RCancel = void>(
  DialogComponent: DialogComponentType<ROk, P, RCancel>
): {
  Component: DialogComponentType<ROk, P, RCancel>;
  showModal: (
    props?: P
  ) => {
    update: (props: P) => void;
    onClose: (handler: (result: ROk) => Promise<void> | void) => void;
    onDismiss: (handler: (result: RCancel) => Promise<void> | void) => void;
    close: (result: ROk) => void;
    dismiss: (result: RCancel) => void;
  };
};
