import React from "react";
import classNames from "classnames";

import "./content-with-sidebar.less";

type OwnSidebarProps = {
    className?: string;
    children?: React.ReactNode;
};

type OwnContentProps = {
    className?: string;
    children?: React.ReactNode;
};

type OwnLayoutProps = {
    className?: string;
    children?: React.ReactNode;
};

const defaultProps = {
  className: null,
  children: null,
};

type SidebarProps = OwnSidebarProps & typeof defaultProps;

// Sidebar

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
function Sidebar({ className, children, ...props }: SidebarProps) {
  return (
    <div className={classNames("layout-sidebar", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}
Sidebar.defaultProps = defaultProps;

type ContentProps = OwnContentProps & typeof defaultProps;

// Content

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
function Content({ className, children, ...props }: ContentProps) {
  return (
    <div className={classNames("layout-content", className)} {...props}>
      <div>{children}</div>
    </div>
  );
}
Content.defaultProps = defaultProps;

type LayoutProps = OwnLayoutProps & typeof defaultProps;

// Layout

// @ts-expect-error ts-migrate(2322) FIXME: Type 'undefined' is not assignable to type 'never'... Remove this comment to see the full error message
export default function Layout({ children, className = undefined, ...props }: LayoutProps) {
  return (
    <div className={classNames("layout-with-sidebar", className)} {...props}>
      {children}
    </div>
  );
}
Layout.defaultProps = defaultProps;

Layout.Sidebar = Sidebar;
Layout.Content = Content;
