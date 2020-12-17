import { trim } from "lodash";
import React, { useState } from "react";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import DynamicComponent from "@/components/DynamicComponent";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import navigateTo from "@/components/ApplicationArea/navigateTo";
import recordEvent from "@/services/recordEvent";
import { policy } from "@/services/policy";
import { Dashboard } from "@/services/dashboard";
type Props = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
};
function CreateDashboardDialog({ dialog }: Props) {
    const [name, setName] = useState("");
    const [isValid, setIsValid] = useState(false);
    const [saveInProgress, setSaveInProgress] = useState(false);
    const isCreateDashboardEnabled = policy.isCreateDashboardEnabled();
    function handleNameChange(event: any) {
        const value = trim(event.target.value);
        setName(value);
        setIsValid(value !== "");
    }
    function save() {
        if (name !== "") {
            setSaveInProgress(true);
            (Dashboard as any).save({ name }).then((data: any) => {
                dialog.close();
                navigateTo(`${data.url}?edit`);
            });
            // @ts-expect-error ts-migrate(2554) FIXME: Expected 4 arguments, but got 2.
            recordEvent("create", "dashboard");
        }
    }
    return (<Modal {...dialog.props} {...(isCreateDashboardEnabled ? {} : { footer: null })} title="New Dashboard" okText="Save" cancelText="Close" okButtonProps={{
        disabled: !isValid || saveInProgress,
        loading: saveInProgress,
        "data-test": "DashboardSaveButton",
    }} cancelButtonProps={{
        disabled: saveInProgress,
    }} onOk={save} closable={!saveInProgress} maskClosable={!saveInProgress} wrapProps={{
        "data-test": "CreateDashboardDialog",
    }}>
      <DynamicComponent name="CreateDashboardDialogExtra" disabled={!isCreateDashboardEnabled}>
        {/* @ts-expect-error ts-migrate(2769) FIXME: No overload matches this call. */}
        <Input defaultValue={name} onChange={handleNameChange} onPressEnter={save} placeholder="Dashboard Name" disabled={saveInProgress} autoFocus/>
      </DynamicComponent>
    </Modal>);
}
export default wrapDialog(CreateDashboardDialog);
