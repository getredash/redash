import React from "react";
import EditInPlace from "@/components/EditInPlace";
import { currentUser } from "@/services/auth";
import Group from "@/services/group";
function updateGroupName(group: any, name: any, onChange: any) {
    group.name = name;
    Group.save(group);
    onChange();
}
type OwnProps = {
    group?: {
        name: string;
    };
    onChange?: (...args: any[]) => any;
};
type Props = OwnProps & typeof GroupName.defaultProps;
// @ts-expect-error ts-migrate(2700) FIXME: Rest types may only be created from object types.
export default function GroupName({ group, onChange, ...props }: Props) {
    if (!group) {
        return null;
    }
    const canEdit = currentUser.isAdmin && (group as any).type !== "builtin";
    return (<h3 {...props}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ className: string; isEditable: any; ignore... Remove this comment to see the full error message */}
      <EditInPlace className="edit-in-place" isEditable={canEdit} ignoreBlanks onDone={name => updateGroupName(group, name, onChange)} value={(group as any).name}/>
    </h3>);
}
GroupName.defaultProps = {
    group: null,
    onChange: () => { },
};
