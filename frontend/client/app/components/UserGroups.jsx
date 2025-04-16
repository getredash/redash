import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Tag from "antd/lib/tag";
import Link from "@/components/Link";

import "./UserGroups.less";

export default function UserGroups({ groups, linkGroups, ...props }) {
  return (
    <div className="user-groups" {...props}>
      {map(groups, group => (
        <Tag key={group.id}>{linkGroups ? <Link href={`groups/${group.id}`}>{group.name}</Link> : group.name}</Tag>
      ))}
    </div>
  );
}

UserGroups.propTypes = {
  groups: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
      name: PropTypes.string,
    })
  ),
  linkGroups: PropTypes.bool,
};

UserGroups.defaultProps = {
  groups: [],
  linkGroups: true,
};
