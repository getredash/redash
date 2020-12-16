import React from "react";
import cx from "classnames";
import { isEmpty } from "lodash";
import Dropdown from "antd/lib/dropdown";
import Modal from "antd/lib/modal";
import Menu from "antd/lib/menu";
import recordEvent from "@/services/recordEvent";
// @ts-expect-error ts-migrate(6133) FIXME: 'Moment' is declared but its value is never read.
import { Moment } from "@/components/proptypes";

import "./Widget.less";

type OwnWidgetDropdownButtonProps = {
    extraOptions?: React.ReactNode;
    showDeleteOption?: boolean;
    onDelete?: (...args: any[]) => any;
};

type WidgetDropdownButtonProps = OwnWidgetDropdownButtonProps & typeof WidgetDropdownButton.defaultProps;

function WidgetDropdownButton({ extraOptions, showDeleteOption, onDelete }: WidgetDropdownButtonProps) {
  const WidgetMenu = (
    <Menu data-test="WidgetDropdownButtonMenu">
      {extraOptions}
      {showDeleteOption && extraOptions && <Menu.Divider />}
      {showDeleteOption && <Menu.Item onClick={onDelete}>Remove from Dashboard</Menu.Item>}
    </Menu>
  );

  return (
    <div className="widget-menu-regular">
      <Dropdown overlay={WidgetMenu} placement="bottomRight" trigger={["click"]}>
        <a className="action p-l-15 p-r-15" data-test="WidgetDropdownButton">
          <i className="zmdi zmdi-more-vert" />
        </a>
      </Dropdown>
    </div>
  );
}

WidgetDropdownButton.defaultProps = {
  extraOptions: null,
  showDeleteOption: false,
  onDelete: () => {},
};

type OwnWidgetDeleteButtonProps = {
    onClick?: (...args: any[]) => any;
};

type WidgetDeleteButtonProps = OwnWidgetDeleteButtonProps & typeof WidgetDeleteButton.defaultProps;

function WidgetDeleteButton({ onClick }: WidgetDeleteButtonProps) {
  return (
    <div className="widget-menu-remove">
      <a className="action" title="Remove From Dashboard" onClick={onClick} data-test="WidgetDeleteButton">
        <i className="zmdi zmdi-close" />
      </a>
    </div>
  );
}
WidgetDeleteButton.defaultProps = { onClick: () => {} };

type OwnWidgetProps = {
    widget: any;
    className?: string;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    canEdit?: boolean;
    isPublic?: boolean;
    // @ts-expect-error ts-migrate(2749) FIXME: 'Moment' refers to a value, but is being used as a... Remove this comment to see the full error message
    refreshStartedAt?: Moment;
    menuOptions?: React.ReactNode;
    tileProps?: any;
    onDelete?: (...args: any[]) => any;
};

type WidgetProps = OwnWidgetProps & typeof Widget.defaultProps;

class Widget extends React.Component<WidgetProps> {

  static defaultProps = {
    className: "",
    children: null,
    header: null,
    footer: null,
    canEdit: false,
    isPublic: false,
    refreshStartedAt: null,
    menuOptions: null,
    tileProps: {},
    onDelete: () => {},
  };

  componentDidMount() {
    const { widget } = this.props;
    // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 3.
    recordEvent("view", "widget", widget.id);
  }

  deleteWidget = () => {
    const { widget, onDelete } = this.props;

    Modal.confirm({
      title: "Delete Widget",
      content: "Are you sure you want to remove this widget from the dashboard?",
      okText: "Delete",
      okType: "danger",
      onOk: () => widget.delete().then(onDelete),
      maskClosable: true,
      autoFocusButton: null,
    });
  };

  render() {
    const { className, children, header, footer, canEdit, isPublic, menuOptions, tileProps } = this.props;
    const showDropdownButton = !isPublic && (canEdit || !isEmpty(menuOptions));
    return (
      <div className="widget-wrapper">
        <div className={cx("tile body-container", className)} {...tileProps}>
          <div className="widget-actions">
            {showDropdownButton && (
              <WidgetDropdownButton
                extraOptions={menuOptions}
                showDeleteOption={canEdit}
                onDelete={this.deleteWidget}
              />
            )}
            {canEdit && <WidgetDeleteButton onClick={this.deleteWidget} />}
          </div>
          <div className="body-row widget-header">{header}</div>
          {children}
          {footer && <div className="body-row tile__bottom-control">{footer}</div>}
        </div>
      </div>
    );
  }
}

export default Widget;
