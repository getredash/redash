import { filter, find, isEmpty, size } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import List from "antd/lib/list";
import Button from "antd/lib/button";
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import BigMessage from "@/components/BigMessage";
import LoadingState from "@/components/items-list/components/LoadingState";
import notification from "@/services/notification";
import useSearchResults from "@/lib/hooks/useSearchResults";

import "./SelectItemsDialog.less";

function ItemsList({ items, renderItem, onItemClick }) {
  const renderListItem = useCallback(
    item => {
      const { content, className, isDisabled } = renderItem(item);

      return (
        <List.Item
          className={classNames("select-items-list", "w-100", "p-l-10", "p-r-10", { disabled: isDisabled }, className)}
          onClick={isDisabled ? null : () => onItemClick(item)}>
          {content}
        </List.Item>
      );
    },
    [renderItem, onItemClick]
  );

  return <List size="small" dataSource={items} renderItem={renderListItem} />;
}

ItemsList.propTypes = {
  items: PropTypes.array,
  renderItem: PropTypes.func,
  onItemClick: PropTypes.func,
};

ItemsList.defaultProps = {
  items: [],
  renderItem: () => {},
  onItemClick: () => {},
};

function SelectItemsDialog({
  dialog,
  dialogTitle,
  inputPlaceholder,
  itemKey,
  renderItem,
  renderStagedItem,
  searchItems,
  selectedItemsTitle,
  width,
  showCount,
  extraFooterContent,
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [search, items, isLoading] = useSearchResults(searchItems, { initialResults: [] });
  const hasResults = items.length > 0;

  useEffect(() => {
    search();
  }, [search]);

  const isItemSelected = useCallback(
    item => {
      const key = itemKey(item);
      return !!find(selectedItems, i => itemKey(i) === key);
    },
    [selectedItems, itemKey]
  );

  const toggleItem = useCallback(
    item => {
      if (isItemSelected(item)) {
        const key = itemKey(item);
        setSelectedItems(filter(selectedItems, i => itemKey(i) !== key));
      } else {
        setSelectedItems([...selectedItems, item]);
      }
    },
    [selectedItems, itemKey, isItemSelected]
  );

  const save = useCallback(() => {
    dialog.close(selectedItems).catch(error => {
      if (error) {
        notification.error("Failed to save some of selected items.");
      }
    });
  }, [dialog, selectedItems]);

  return (
    <Modal
      {...dialog.props}
      className="select-items-dialog"
      width={width}
      title={dialogTitle}
      footer={
        <div className="d-flex align-items-center">
          <span className="flex-fill m-r-5" style={{ textAlign: "left", color: "rgba(0, 0, 0, 0.5)" }}>
            {extraFooterContent}
          </span>
          <Button {...dialog.props.cancelButtonProps} onClick={dialog.dismiss}>
            Cancel
          </Button>
          <Button
            {...dialog.props.okButtonProps}
            onClick={save}
            disabled={selectedItems.length === 0 || dialog.props.okButtonProps.disabled}
            type="primary">
            Save
            {showCount && !isEmpty(selectedItems) ? ` (${size(selectedItems)})` : null}
          </Button>
        </div>
      }>
      <div className="d-flex align-items-center m-b-10">
        <div className="flex-fill">
          <Input.Search
            onChange={event => search(event.target.value)}
            placeholder={inputPlaceholder}
            aria-label={inputPlaceholder}
            autoFocus
          />
        </div>
        {renderStagedItem && (
          <div className="w-50 m-l-20">
            <h5 className="m-0">{selectedItemsTitle}</h5>
          </div>
        )}
      </div>

      <div className="d-flex align-items-stretch" style={{ minHeight: "30vh", maxHeight: "50vh" }}>
        <div className="flex-fill scrollbox">
          {isLoading && <LoadingState className="" />}
          {!isLoading && !hasResults && (
            <BigMessage icon="fa-search" message="No items match your search." className="" />
          )}
          {!isLoading && hasResults && (
            <ItemsList
              items={items}
              renderItem={item => renderItem(item, { isSelected: isItemSelected(item) })}
              onItemClick={toggleItem}
            />
          )}
        </div>
        {renderStagedItem && (
          <div className="w-50 m-l-20 scrollbox">
            {selectedItems.length > 0 && (
              <ItemsList
                items={selectedItems}
                renderItem={item => renderStagedItem(item, { isSelected: true })}
                onItemClick={toggleItem}
              />
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

SelectItemsDialog.propTypes = {
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
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  extraFooterContent: PropTypes.node,
  showCount: PropTypes.bool,
};

SelectItemsDialog.defaultProps = {
  dialogTitle: "Add Items",
  inputPlaceholder: "Search...",
  selectedItemsTitle: "Selected items",
  itemKey: item => item.id,
  renderItem: () => "",
  renderStagedItem: null, // hidden by default
  width: "80%",
  extraFooterContent: null,
  showCount: false,
};

export default wrapDialog(SelectItemsDialog);
