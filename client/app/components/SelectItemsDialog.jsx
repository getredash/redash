import { filter, debounce } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import Modal from 'antd/lib/modal';
import Input from 'antd/lib/input';
import List from 'antd/lib/list';
import { wrap as wrapDialog, DialogPropType } from '@/components/DialogWrapper';

import LoadingState from '@/components/items-list/components/LoadingState';

class SelectItemsDialog extends React.Component {
  static propTypes = {
    dialog: DialogPropType.isRequired,
    dialogTitle: PropTypes.string,
    inputPlaceholder: PropTypes.string,
    selectedItemsTitle: PropTypes.string,
    searchItems: PropTypes.func.isRequired, // (searchTerm: string): Promise<Items[]> if `searchTerm === ''` load all
    itemKey: PropTypes.func, // (item) => string|number - return key of item (by default `id`)
    // left list
    // (item, { isSelected }) => {
    //   content: node, // item contents
    //   className: string = '', // additional class for item wrapper
    //   isDisabled: bool = false, // is item clickable or disabled
    // }
    renderItem: PropTypes.func,
    // right list; args/results save as for `renderItem`. if not specified - `renderItem` will be used
    renderStagedItem: PropTypes.func,
    save: PropTypes.func, // (selectedItems[]) => Promise<any>
  };

  static defaultProps = {
    dialogTitle: 'Add Items',
    inputPlaceholder: 'Search...',
    selectedItemsTitle: 'Selected items',
    itemKey: item => item.id,
    renderItem: () => '',
    renderStagedItem: null, // use `renderItem` by default
    save: items => items,
  };

  selectedIds = new Set();

  state = {
    searchTerm: '',
    loading: false,
    items: [],
    selected: [],
    saveInProgress: false,
  };

  // eslint-disable-next-line react/sort-comp
  loadItems = (searchTerm = '') => {
    this.setState({ searchTerm, loading: true }, () => {
      this.props.searchItems(searchTerm)
        .then((items) => {
          // If another search appeared while loading data - just reject this set
          if (this.state.searchTerm === searchTerm) {
            this.setState({ items, loading: false });
          }
        })
        .catch(() => {
          if (this.state.searchTerm === searchTerm) {
            this.setState({ items: [], loading: false });
          }
        });
    });
  };

  search = debounce(this.loadItems, 200);

  componentDidMount() {
    this.loadItems();
  }

  toggleItem(item) {
    const key = this.props.itemKey(item);
    if (this.selectedIds.has(key)) {
      this.selectedIds.delete(key);
      this.setState(({ selected }) => ({
        selected: filter(selected, i => this.props.itemKey(i) !== key),
      }));
    } else {
      this.selectedIds.add(key);
      this.setState(({ selected }) => ({
        selected: [...selected, item],
      }));
    }
  }

  save() {
    this.setState({ saveInProgress: true }, () => {
      const selectedItems = this.state.selected;
      Promise.resolve(this.props.save(selectedItems))
        .then(() => {
          this.props.dialog.close(selectedItems);
        })
        .catch(() => {
          this.setState({ saveInProgress: false });
        });
    });
  }

  renderSlot(item, isStagedList) {
    const { itemKey, renderItem, renderStagedItem } = this.props;
    const key = itemKey(item);
    const isSelected = this.selectedIds.has(key);

    const render = isStagedList ? (renderStagedItem || renderItem) : renderItem;

    const { content, className, isDisabled } = render(item, { isSelected });

    return (
      <List.Item
        className={classNames('p-l-10', 'p-r-10', { clickable: !isDisabled }, className)}
        onClick={isDisabled ? null : () => this.toggleItem(item)}
      >
        {content}
      </List.Item>
    );
  }

  render() {
    const { dialog, dialogTitle, inputPlaceholder, selectedItemsTitle } = this.props;
    const { loading, saveInProgress, items, selected } = this.state;
    const hasResults = items.length > 0;
    return (
      <Modal
        {...dialog.props}
        width="80%"
        title={dialogTitle}
        okText="Save"
        okButtonProps={{
          loading: saveInProgress,
        }}
        onOk={() => this.save()}
      >
        <div className="row m-b-10">
          <div className="col-xs-6">
            <Input.Search
              defaultValue={this.state.searchTerm}
              onChange={event => this.search(event.target.value)}
              placeholder={inputPlaceholder}
              autoFocus
            />
          </div>
          <div className="col-xs-6">
            <h5 className="m-t-10">{selectedItemsTitle}</h5>
          </div>
        </div>

        <div className="row">
          <div className="col-xs-6">
            {loading && <LoadingState />}
            {!loading && !hasResults && (
              <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: '150px' }}>
                Search results will appear here
              </div>
            )}
            {!loading && hasResults && (
              <div className="scrollbox" style={{ maxHeight: '50vh' }}>
                {(items.length > 0) && (
                  <List
                    size="small"
                    dataSource={items}
                    renderItem={item => this.renderSlot(item, false)}
                  />
                )}
              </div>
            )}
          </div>
          <div className="col-xs-6">
            <div className="scrollbox" style={{ maxHeight: '50vh' }}>
              {(selected.length > 0) && (
                <List
                  size="small"
                  dataSource={selected}
                  renderItem={item => this.renderSlot(item, true)}
                />
              )}
            </div>
          </div>
        </div>
      </Modal>
    );
  }
}

export default wrapDialog(SelectItemsDialog);
