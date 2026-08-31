import DynamicComponent from "@/components/DynamicComponent";
import React from "react";
import AIFormSettings from "./AIFormSettings";

export default function AISettings(props) {
  return (
    <DynamicComponent name="OrganizationSettings.AISettings" {...props}>
      <h3 className="m-t-0">Artificial Intelligence</h3>
      <hr />
      <AIFormSettings {...props} />
    </DynamicComponent>
  );
}
