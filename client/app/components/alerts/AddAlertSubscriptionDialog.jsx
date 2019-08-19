import React from 'react';
import PropTypes from 'prop-types';
import { isEmpty, includes } from 'lodash';

import Input from 'antd/lib/input';
import Modal from 'antd/lib/modal';
import List from 'antd/lib/list';

import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';
import { Destination as DestinationType } from '@/components/proptypes';
import EmptyState from '@/components/items-list/components/EmptyState';


// import notification from '@/services/notification';


class AddAlertSubscriptionDialog extends React.Component {
  static propTypes = {
    destinations: PropTypes.arrayOf(DestinationType).isRequired,
    onSubscribe: PropTypes.func.isRequired,
    onUnsubscribe: PropTypes.func.isRequired,
    dialog: DialogPropType.isRequired,
  };

  state = {
    searchText: '',
  }

  clickItem = (item, isSelected) => {
    if (isSelected) {
      this.props.onUnsubscribe(item);
    } else {
      this.props.onSubscribe(item);
    }
  }

  renderItem = (item, { isSelected }) => (
    <List.Item
      className={isSelected && 'selected'}
      onClick={() => this.clickItem(item, isSelected)}
    >
      <i className={`fa fa-${item.icon}`} /> {item.name}
      <i className={`fa fa-${isSelected ? 'checked' : 'plus'}`} />
    </List.Item>
  )

  render() {
    const { dialog, destinations } = this.props;
    const { searchText } = this.state;
    const filtered = destinations.filter(d => isEmpty(searchText) ||
      includes(d.name.toLowerCase(), searchText.toLowerCase()) ||
      includes(d.type.toLowerCase(), searchText.toLowerCase()));

    return (
      <Modal
        {...dialog.props}
        title="Add Alert Destination"
        closable
        maskClosable
      >
        <div data-test="AddDestinationDialog">
          <Input.Search
            placeholder="Search..."
            onChange={e => this.setState({ searchText: e.target.value })}
            autoFocus
            data-test="SearchSource"
          />
          <div className="scrollbox p-5 m-t-10" style={{ minHeight: '30vh', maxHeight: '40vh' }}>
            {isEmpty(filtered) ? (<EmptyState className="" />) : (
              <List
                size="small"
                dataSource={filtered}
                renderItem={this.renderItem}
              />
            )}
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(AddAlertSubscriptionDialog);
