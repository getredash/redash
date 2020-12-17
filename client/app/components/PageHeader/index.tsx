import React from "react";

import "./index.less";

type OwnProps = {
    title?: string;
    actions?: React.ReactNode;
};

type Props = OwnProps & typeof PageHeader.defaultProps;

export default function PageHeader({ title, actions }: Props) {
  return (
    <div className="page-header-wrapper">
      <h3>{title}</h3>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  );
}

PageHeader.defaultProps = {
  title: "",
  actions: null,
};
