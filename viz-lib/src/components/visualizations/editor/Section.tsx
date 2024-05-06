import React from "react";
import cx from "classnames";

import "./Section.less";

type OwnSectionTitleProps = {
  className?: string;
  children?: React.ReactNode;
};

const defaultSectionTitleProps = {
  className: null,
  children: null,
};

type SectionTitleProps = OwnSectionTitleProps & typeof defaultSectionTitleProps;

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

SectionTitle.defaultProps = defaultSectionTitleProps;

type OwnSectionProps = {
  className?: string;
  children?: JSX.Element | JSX.Element[];
};

const defaultSectionProps = {
  className: null,
  children: null,
};

type SectionProps = OwnSectionProps & typeof defaultSectionProps;

export default function Section({ className, children, ...props }: any) {
  return (
    <div className={cx("visualization-editor-section", className)} {...props}>
      {children}
    </div>
  );
}

Section.defaultProps = defaultSectionProps;
Section.Title = SectionTitle;
