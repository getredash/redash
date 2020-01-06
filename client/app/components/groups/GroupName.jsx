import React from "react";
import PropTypes from "prop-types";
import EditInPlace from "@/components/EditInPlace";
import { currentUser } from "@/services/auth";

function updateGroupName(group, name, onChange) {
  group.name = name;
  group.$save();
  onChange();
}

export default function GroupName({ group, onChange, ...props }) {
  if (!group) {
    return null;
  }

  const canEdit = currentUser.isAdmin && group.type !== "builtin";

  return (
    <h3 {...props}>
      <EditInPlace
        className="edit-in-place"
        isEditable={canEdit}
        ignoreBlanks
        onDone={name => updateGroupName(group, name, onChange)}
        value={group.name}
      />
    </h3>
  );
}

GroupName.propTypes = {
  group: PropTypes.shape({
    name: PropTypes.string.isRequired,
    $save: PropTypes.func.isRequired,
  }),
  onChange: PropTypes.func,
};

GroupName.defaultProps = {
  group: null,
  onChange: () => {},
};
