import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Tag from "antd/lib/tag";
import Link from "@/components/Link";

export default function UserGroups({ groups, ...props }) {
  return (
    <div {...props}>
      {map(groups, group => (
        <Tag className="m-b-5 m-r-5" key={group.id}>
          <Link href={`groups/${group.id}`}>{group.name}</Link>
        </Tag>
      ))}
    </div>
  );
}

UserGroups.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string,
    })
  ),
};

UserGroups.defaultProps = {
  groups: [],
};
