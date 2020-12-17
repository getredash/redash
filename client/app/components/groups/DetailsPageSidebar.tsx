import React from "react";
import Button from "antd/lib/button";
import Divider from "antd/lib/divider";
import * as Sidebar from "@/components/items-list/components/Sidebar";
import { ControllerType } from "@/components/items-list/ItemsList";
import DeleteGroupButton from "./DeleteGroupButton";
import { currentUser } from "@/services/auth";
type OwnProps = {
    controller: ControllerType;
    group?: any;
    items: any[];
    canAddMembers?: boolean;
    onAddMembersClick?: (...args: any[]) => any;
    canAddDataSources?: boolean;
    onAddDataSourcesClick?: (...args: any[]) => any;
    onGroupDeleted?: (...args: any[]) => any;
};
type Props = OwnProps & typeof DetailsPageSidebar.defaultProps;
export default function DetailsPageSidebar({ controller, group, items, canAddMembers, onAddMembersClick, canAddDataSources, onAddDataSourcesClick, onGroupDeleted, }: Props) {
    const canRemove = group && currentUser.isAdmin && (group as any).type !== "builtin";
    return (<React.Fragment>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'any' is not assignable to type 'never'. */}
      <Sidebar.Menu items={items} selected={(controller as any).params.currentPage}/>
      {canAddMembers && (<Button className="w-100 m-t-5" type="primary" onClick={onAddMembersClick}>
          <i className="fa fa-plus m-r-5"/>
          Add Members
        </Button>)}
      {canAddDataSources && (<Button className="w-100 m-t-5" type="primary" onClick={onAddDataSourcesClick}>
          <i className="fa fa-plus m-r-5"/>
          Add Data Sources
        </Button>)}
      {canRemove && (<React.Fragment>
          <Divider dashed className="m-t-10 m-b-10"/>
          {/* @ts-expect-error ts-migrate(2745) FIXME: This JSX tag's 'children' prop expects type 'never... Remove this comment to see the full error message */}
          <DeleteGroupButton className="w-100" group={group} onClick={onGroupDeleted}>
            Delete Group
          </DeleteGroupButton>
        </React.Fragment>)}
    </React.Fragment>);
}
DetailsPageSidebar.defaultProps = {
    group: null,
    canAddMembers: false,
    onAddMembersClick: null,
    canAddDataSources: false,
    onAddDataSourcesClick: null,
    onGroupDeleted: null,
};
