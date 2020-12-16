import { map } from "lodash";
import React from "react";
import Tag from "antd/lib/tag";
import Link from "@/components/Link";

import "./UserGroups.less";

type OwnProps = {
    groups?: {
        id: number | string;
        name?: string;
    }[];
    linkGroups?: boolean;
};

type Props = OwnProps & typeof UserGroups.defaultProps;

export default function UserGroups({ groups, linkGroups, ...props }: Props) {
  return (
    <div className="user-groups" {...props}>
      {map(groups, group => (
        <Tag key={group.id}>{linkGroups ? <Link href={`groups/${group.id}`}>{group.name}</Link> : group.name}</Tag>
      ))}
    </div>
  );
}

UserGroups.defaultProps = {
  groups: [],
  linkGroups: true,
};
