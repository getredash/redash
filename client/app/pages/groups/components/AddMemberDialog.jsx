import { map, filter, debounce, sortBy } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import Icon from 'antd/lib/icon';
import Collapse from 'antd/lib/collapse';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

import LoadingState from '@/components/items-list/components/LoadingState';

import { User } from '@/services/user';
import { Group } from '@/services/group';

function UserCard({ user, children }) {
  return (
    <div className="w-100 d-flex align-items-center">
      <img src={user.profile_image_url} height="32" className="profile__image--settings m-r-5" alt={user.name} />
      <div className="flex-fill">
        <div>{user.name}</div>
        <div className="text-muted">{user.email}</div>
      </div>
      {children}
    </div>
  );
}

UserCard.propTypes = {
  user: PropTypes.object, // eslint-disable-line react/forbid-prop-types
  children: PropTypes.node,
};
UserCard.defaultProps = {
  user: null,
  children: null,
};

class AddMemberDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    group: PropTypes.object.isRequired, // eslint-disable-line react/forbid-prop-types
  };

  selectedIds = new Set();

  groups = [];

  state = {
    selected: [],
    searchTerm: '',
    loadingResults: false,
    searchedGroups: [],
    searchedUsers: [],
    groupMembers: [],
  };

  search = debounce((searchTerm) => {
    if (searchTerm === '') {
      this.setState({
        searchTerm,
        searchedGroups: [],
        searchedUsers: [],
        selected: [],
        loadingResults: false,
      });
    } else {
      this.setState({ searchTerm, loadingResults: true }, () => {
        User.query({ q: searchTerm }).$promise.then(({ results }) => {
          // If another search appeared while loading data - just reject this set
          if (this.state.searchTerm === searchTerm) {
            const term = searchTerm.toLowerCase();
            this.setState({
              searchedGroups: filter(this.groups, group => group.name.toLowerCase().includes(term)),
              searchedUsers: results,
              loadingResults: false,
              selected: [],
            });
          }
        });
      });
    }
  }, 200);

  constructor(props) {
    super(props);
    Group.query().$promise.then((results) => {
      results = map(results, item => new Group(item));
      results = filter(results, group => group.id !== this.props.group.id);
      results = sortBy(results, 'name');
      this.groups = results;
    });
  }

  toggleUser(user) {
    if (this.selectedIds.has(user.id)) {
      this.selectedIds.delete(user.id);
      this.setState(({ selected }) => ({
        selected: filter(selected, u => u.id !== user.id),
      }));
    } else {
      this.selectedIds.add(user.id);
      this.setState(({ selected }) => ({
        selected: [...selected, user],
      }));
    }
  }

  save() {
    this.props.dialog.close(this.state.selected);
  }

  loadGroupUsers(groupId) {
    groupId = parseInt(groupId, 10) || null;
    if (groupId) {
      Group.members({ id: groupId }).$promise.then((groupMembers) => {
        this.setState({ groupMembers });
      });
    } else {
      this.setState({ groupMembers: [] });
    }
  }

  renderSlot(user, addIcon) {
    const isSelected = this.selectedIds.has(user.id);
    return (
      <List.Item onClick={() => this.toggleUser(user)}>
        <UserCard condensed user={user}>
          {isSelected && addIcon && (
            <Icon
              className="m-l-10 m-r-10"
              type="check-circle"
              theme="twoTone"
              twoToneColor="#52c41a"
              style={{ fontSize: '20px' }}
            />
          )}
        </UserCard>
      </List.Item>
    );
  }

  renderGroups() {
    const { searchedGroups, groupMembers } = this.state;
    return (
      <Collapse accordion onChange={key => this.loadGroupUsers(key)}>
        {map(searchedGroups, group => (
          <Collapse.Panel key={group.id} header={group.name}>
            {(groupMembers.length === 0) && <i>No users in this group</i>}
            {(groupMembers.length > 0) && (
              <List
                size="small"
                dataSource={groupMembers}
                renderItem={item => this.renderSlot(item, true)}
              />
            )}
          </Collapse.Panel>
        ))}
      </Collapse>
    );
  }

  render() {
    const { dialog } = this.props;
    const { selected, loadingResults, searchedGroups, searchedUsers } = this.state;
    const hasResults = (searchedGroups.length > 0) || (searchedUsers.length > 0);
    return (
      <Modal {...dialog.props} width="80%" title="Add Members" okText="Save" onOk={() => this.save()}>
        <div className="row m-0">
          <div className="col-xs-8 p-0">
            <div className="m-b-15">
              <Input.Search
                defaultValue={this.state.searchTerm}
                onChange={event => this.search(event.target.value)}
                placeholder="Search users..."
                autoFocus
              />
            </div>
            {loadingResults && <LoadingState />}
            {!loadingResults && !hasResults && (
              <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: '150px' }}>
                Search results will appear here
              </div>
            )}
            {!loadingResults && hasResults && (
              <div className="row m-0">
                <div className="col-xs-6 p-l-0">
                  <div className="scrollbox" style={{ maxHeight: '50vh' }}>
                    {(searchedGroups.length > 0) && this.renderGroups()}
                  </div>
                </div>
                <div className="col-xs-6 p-0">
                  <div className="scrollbox" style={{ maxHeight: '50vh' }}>
                    {(searchedUsers.length > 0) && (
                      <List
                        size="small"
                        dataSource={searchedUsers}
                        renderItem={item => this.renderSlot(item, true)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-xs-4 p-r-0">
            <h5 className="m-t-10 m-b-15">Selected users</h5>
            <div className="scrollbox" style={{ maxHeight: '50vh' }}>
              {(selected.length > 0) && (
                <List
                  size="small"
                  dataSource={selected}
                  renderItem={item => this.renderSlot(item, false)}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(AddMemberDialog);
