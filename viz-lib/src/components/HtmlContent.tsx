import React from "react";
import PropTypes from "prop-types";
import sanitize from "@/services/sanitize";

const HtmlContent = React.memo(function HtmlContent({ children, ...props }: { children?: string; [key: string]: any }) {
  return (
    <div
      {...props}
      dangerouslySetInnerHTML={{ __html: sanitize(children || "") }} // eslint-disable-line react/no-danger
    />
  );
});

// @ts-expect-error ts-migrate(2339) FIXME: Property 'propTypes' does not exist on type 'Named... Remove this comment to see the full error message
HtmlContent.propTypes = {
  children: PropTypes.string,
};

// @ts-expect-error ts-migrate(2339) FIXME: Property 'defaultProps' does not exist on type 'Na... Remove this comment to see the full error message
HtmlContent.defaultProps = {
  children: "",
};

export default HtmlContent;
