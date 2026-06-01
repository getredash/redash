import React from "react";
import PropTypes from "prop-types";
import sanitize from "@/services/sanitize";

const HtmlContent = React.memo(function HtmlContent({
  children: children = "",
  ...props
}: {
  children?: string;
  [key: string]: any;
}) {
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

export default HtmlContent;
