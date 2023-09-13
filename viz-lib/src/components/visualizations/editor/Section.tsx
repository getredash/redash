import React from "react";
import cx from "classnames";

import "./Section.less";

type OwnSectionTitleProps = {
  className?: string;
  children?: React.ReactNode;
};

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
function SectionTitle({ className, children, ...props }: SectionTitleProps) {
  if (!children) {
    return null;
  }

  return (
    <h4 className={cx("visualization-editor-section-title", className)} {...props}>
      {children}
    </h4>
  );
}

SectionTitle.defaultProps = {
  className: null,
  children: null,
};

type SectionTitleProps = OwnSectionTitleProps & typeof SectionTitle.defaultProps;

type OwnSectionProps = {
  className?: string;
  children?: React.ReactNode;
};

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Section({ className, children, ...props }: SectionProps) {
  return (
    <div className={cx("visualization-editor-section", className)} {...props}>
      {children}
    </div>
  );
}

Section.defaultProps = {
  className: null,
  children: null,
};

type SectionProps = OwnSectionProps & typeof Section.defaultProps;

Section.Title = SectionTitle;
