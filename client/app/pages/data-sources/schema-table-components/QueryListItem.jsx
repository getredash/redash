import React from "react";
import Input from "antd/lib/input";
import PropTypes from "prop-types";
import { Query } from "@/components/proptypes";

const QueryListItem = props => {
  if (!props.query) {
    return <div />;
  }

  return (
    <div className="p-relative">
      <Input className="bg-white" readOnly="readonly" disabled value={props.query.name} />
      {props.removeQuery ? (
        <a
          href="#"
          onClick={() => props.removeQuery(null)}
          className="d-flex align-items-center justify-content-center"
          style={{
            position: "absolute",
            right: "1px",
            top: "1px",
            bottom: "1px",
            width: "30px",
            background: "#fff",
            borderRadius: "3px",
          }}>
          <i className="text-muted fa fa-times" />
        </a>
      ) : null}
    </div>
  );
};

QueryListItem.propTypes = {
  query: Query.isRequired,
  removeQuery: PropTypes.func.isRequired,
};

export default QueryListItem;
