import React, { useState, useEffect, useCallback } from "react";
import { axios } from "@/services/axios";
import { each, debounce, get, find } from "lodash";
import Button from "antd/lib/button";
import List from "antd/lib/list";
import Modal from "antd/lib/modal";
import Select from "antd/lib/select";
import Tag from "antd/lib/tag";
import Tooltip from "antd/lib/tooltip";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import { toHuman } from "@/lib/utils";
import HelpTrigger from "@/components/HelpTrigger";
import { UserPreviewCard } from "@/components/PreviewCard";
import notification from "@/services/notification";
import User from "@/services/user";
import "./index.less";
const { Option } = Select;
const DEBOUNCE_SEARCH_DURATION = 200;
function useGrantees(url: any) {
    const loadGrantees = useCallback(() => axios.get(url).then(data => {
        const resultGrantees: any = [];
        each(data, (grantees, accessType) => {
            grantees.forEach((grantee: any) => {
                grantee.accessType = toHuman(accessType);
                resultGrantees.push(grantee);
            });
        });
        return resultGrantees;
    }), [url]);
    const addPermission = useCallback((userId, accessType = "modify") => axios
        .post(url, { access_type: accessType, user_id: userId })
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        .catch(() => notification.error("Could not grant permission to the user")), [url]);
    const removePermission = useCallback((userId, accessType = "modify") => axios
        .delete(url, { data: { access_type: accessType, user_id: userId } })
        // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
        .catch(() => notification.error("Could not remove permission from the user")), [url]);
    return { loadGrantees, addPermission, removePermission };
}
const searchUsers = (searchTerm: any) => User.query({ q: searchTerm })
    // @ts-expect-error ts-migrate(2339) FIXME: Property 'results' does not exist on type 'AxiosRe... Remove this comment to see the full error message
    .then(({ results }) => results)
    .catch(() => []);
type OwnPermissionsEditorDialogHeaderProps = {
    context?: "query" | "dashboard";
};
type PermissionsEditorDialogHeaderProps = OwnPermissionsEditorDialogHeaderProps & typeof PermissionsEditorDialogHeader.defaultProps;
function PermissionsEditorDialogHeader({ context }: PermissionsEditorDialogHeaderProps) {
    return (<>
      Manage Permissions
      <div className="modal-header-desc">
        {`Editing this ${context} is enabled for the users in this list and for admins. `}
        {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'never'. */}
        <HelpTrigger type="MANAGE_PERMISSIONS"/>
      </div>
    </>);
}
PermissionsEditorDialogHeader.defaultProps = { context: "query" };
type OwnUserSelectProps = {
    onSelect?: (...args: any[]) => any;
    shouldShowUser?: (...args: any[]) => any;
};
type UserSelectProps = OwnUserSelectProps & typeof UserSelect.defaultProps;
function UserSelect({ onSelect, shouldShowUser }: UserSelectProps) {
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const debouncedSearchUsers = useCallback(debounce((search: any) => searchUsers(search)
        .then(setUsers)
        .finally(() => setLoadingUsers(false)), DEBOUNCE_SEARCH_DURATION), []);
    useEffect(() => {
        setLoadingUsers(true);
        debouncedSearchUsers(searchTerm);
    }, [debouncedSearchUsers, searchTerm]);
    return (<Select className="w-100 m-b-10" placeholder="Add users..." showSearch onSearch={setSearchTerm} suffixIcon={loadingUsers ? <i className="fa fa-spinner fa-pulse"/> : <i className="fa fa-search"/>} filterOption={false} notFoundContent={null} value={undefined} getPopupContainer={trigger => trigger.parentNode} onSelect={onSelect}>
      {users.filter(shouldShowUser).map(user => (<Option key={(user as any).id} value={(user as any).id}>
          <UserPreviewCard user={user}/>
        </Option>))}
    </Select>);
}
UserSelect.defaultProps = { onSelect: () => { }, shouldShowUser: () => true };
type OwnPermissionsEditorDialogProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    author: any;
    context?: "query" | "dashboard";
    aclUrl: string;
};
type PermissionsEditorDialogProps = OwnPermissionsEditorDialogProps & typeof PermissionsEditorDialog.defaultProps;
function PermissionsEditorDialog({ dialog, author, context, aclUrl }: PermissionsEditorDialogProps) {
    const [loadingGrantees, setLoadingGrantees] = useState(true);
    const [grantees, setGrantees] = useState([]);
    const { loadGrantees, addPermission, removePermission } = useGrantees(aclUrl);
    const loadUsersWithPermissions = useCallback(() => {
        setLoadingGrantees(true);
        loadGrantees()
            .then(setGrantees)
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
            .catch(() => notification.error("Failed to load grantees list"))
            .finally(() => setLoadingGrantees(false));
    }, [loadGrantees]);
    const userHasPermission = useCallback(user => user.id === author.id || !!get(find(grantees, { id: user.id }), "accessType"), [author.id, grantees]);
    useEffect(() => {
        loadUsersWithPermissions();
    }, [aclUrl, loadUsersWithPermissions]);
    return (<Modal {...dialog.props} className="permissions-editor-dialog" title={<PermissionsEditorDialogHeader context={context}/>} footer={<Button onClick={dialog.dismiss}>Close</Button>}>
      {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(userId: any) => Promise<void>' is not assig... Remove this comment to see the full error message */}
      <UserSelect onSelect={(userId: any) => addPermission(userId).then(loadUsersWithPermissions)} shouldShowUser={(user: any) => !userHasPermission(user)}/>
      <div className="d-flex align-items-center m-t-5">
        <h5 className="flex-fill">Users with permissions</h5>
        {loadingGrantees && <i className="fa fa-spinner fa-pulse"/>}
      </div>
      <div className="scrollbox p-5" style={{ maxHeight: "40vh" }}>
        <List size="small" dataSource={[author, ...grantees]} renderItem={user => (<List.Item>
              <UserPreviewCard key={user.id} user={user}>
                {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
                {user.id === author.id ? (<Tag className="m-0">Author</Tag>) : (<Tooltip title="Remove user permissions">
                    <i className="fa fa-remove clickable" onClick={() => removePermission(user.id).then(loadUsersWithPermissions)}/>
                  </Tooltip>)}
              </UserPreviewCard>
            </List.Item>)}/>
      </div>
    </Modal>);
}
PermissionsEditorDialog.defaultProps = { context: "query" };
export default wrapDialog(PermissionsEditorDialog);
