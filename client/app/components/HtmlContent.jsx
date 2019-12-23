import React from "react";
import PropTypes from "prop-types";
import { $sanitize } from "@/services/ng";

export default function HtmlContent({ children, ...props }) {
  return (
    <div
      {...props}
      dangerouslySetInnerHTML={{ __html: $sanitize(children) }} // eslint-disable-line react/no-danger
    />
  );
}

HtmlContent.propTypes = {
  children: PropTypes.string,
};

HtmlContent.defaultProps = {
  children: "",
};
