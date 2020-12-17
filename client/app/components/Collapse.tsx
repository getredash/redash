import React from "react";
import cx from "classnames";
import AntCollapse from "antd/lib/collapse";

type OwnProps = {
    collapsed?: boolean;
    children?: React.ReactNode;
    className?: string;
};

type Props = OwnProps & typeof Collapse.defaultProps;

export default function Collapse({ collapsed, children, className, ...props }: Props) {
  return (
    <AntCollapse
      {...props}
      // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | null' is not assignable to type 'st... Remove this comment to see the full error message
      activeKey={collapsed ? null : "content"}
      className={cx(className, "ant-collapse-headerless")}>
      <AntCollapse.Panel key="content" header="">
        {children}
      </AntCollapse.Panel>
    </AntCollapse>
  );
}

Collapse.defaultProps = {
  collapsed: true,
  children: null,
  className: "",
};
