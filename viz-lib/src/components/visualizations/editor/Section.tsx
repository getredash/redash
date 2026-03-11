import React from "react";
import cx from "classnames";

import "./Section.less";

type OwnSectionTitleProps = {
  className?: string;
  children?: React.ReactNode;
};

const sectionTitleDefaultProps = {
  className: null,
  children: null,
};

type SectionTitleProps = OwnSectionTitleProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
function SectionTitle({ className: className = null, children: children = null, ...props }: SectionTitleProps) {
  if (!children) {
    return null;
  }

  return (
    <h4 className={cx("visualization-editor-section-title", className)} {...props}>
      {children}
    </h4>
  );
}

type OwnSectionProps = {
  className?: string;
  children?: React.ReactNode;
};

const sectionDefaultProps = {
  className: null,
  children: null,
};

type SectionProps = OwnSectionProps;

// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function Section({ className: className = null, children: children = null, ...props }: SectionProps) {
  return (
    <div className={cx("visualization-editor-section", className)} {...props}>
      {children}
    </div>
  );
}

Section.Title = SectionTitle;
