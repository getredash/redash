import { filter, find, isEmpty, size } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import classNames from "classnames";
import Modal from "antd/lib/modal";
import Input from "antd/lib/input";
import List from "antd/lib/list";
import Button from "antd/lib/button";
// @ts-expect-error ts-migrate(6133) FIXME: 'DialogPropType' is declared but its value is neve... Remove this comment to see the full error message
import { wrap as wrapDialog, DialogPropType } from "@/components/DialogWrapper";
import BigMessage from "@/components/BigMessage";
import LoadingState from "@/components/items-list/components/LoadingState";
import notification from "@/services/notification";
import useSearchResults from "@/lib/hooks/useSearchResults";
type OwnItemsListProps = {
    items?: any[];
    renderItem?: (...args: any[]) => any;
    onItemClick?: (...args: any[]) => any;
};
type ItemsListProps = OwnItemsListProps & typeof ItemsList.defaultProps;
function ItemsList({ items, renderItem, onItemClick }: ItemsListProps) {
    const renderListItem = useCallback(item => {
        const { content, className, isDisabled } = renderItem(item);
        // @ts-expect-error ts-migrate(2322) FIXME: Type '(() => any) | null' is not assignable to typ... Remove this comment to see the full error message
        return (<List.Item className={classNames("p-l-10", "p-r-10", { clickable: !isDisabled, disabled: isDisabled }, className)} onClick={isDisabled ? null : () => onItemClick(item)}>
          {content}
        </List.Item>);
    }, [renderItem, onItemClick]);
    return <List size="small" dataSource={items} renderItem={renderListItem}/>;
}
ItemsList.defaultProps = {
    items: [],
    renderItem: () => { },
    onItemClick: () => { },
};
type OwnSelectItemsDialogProps = {
    // @ts-expect-error ts-migrate(2749) FIXME: 'DialogPropType' refers to a value, but is being u... Remove this comment to see the full error message
    dialog: DialogPropType;
    dialogTitle?: string;
    inputPlaceholder?: string;
    selectedItemsTitle?: string;
    searchItems: (...args: any[]) => any;
    itemKey?: (...args: any[]) => any;
    renderItem?: (...args: any[]) => any;
    renderStagedItem?: (...args: any[]) => any;
    width?: string | number;
    extraFooterContent?: React.ReactNode;
    showCount?: boolean;
};
type SelectItemsDialogProps = OwnSelectItemsDialogProps & typeof SelectItemsDialog.defaultProps;
function SelectItemsDialog({ dialog, dialogTitle, inputPlaceholder, itemKey, renderItem, renderStagedItem, searchItems, selectedItemsTitle, width, showCount, extraFooterContent, }: SelectItemsDialogProps) {
    const [selectedItems, setSelectedItems] = useState([]);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'never[]' is not assignable to type 'null | u... Remove this comment to see the full error message
    const [search, items, isLoading] = useSearchResults(searchItems, { initialResults: [] });
    const hasResults = (items as any).length > 0;
    useEffect(() => {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        search();
    }, [search]);
    const isItemSelected = useCallback(item => {
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        const key = itemKey(item);
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        return !!find(selectedItems, i => itemKey(i) === key);
    }, [selectedItems, itemKey]);
    const toggleItem = useCallback(item => {
        if (isItemSelected(item)) {
            // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
            const key = itemKey(item);
            // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
            setSelectedItems(filter(selectedItems, i => itemKey(i) !== key));
        }
        else {
            // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'any[]' is not assignable to para... Remove this comment to see the full error message
            setSelectedItems([...selectedItems, item]);
        }
    }, [selectedItems, itemKey, isItemSelected]);
    const save = useCallback(() => {
        (dialog as any).close(selectedItems).catch((error: any) => {
            if (error) {
                // @ts-expect-error ts-migrate(2345) FIXME: Argument of type 'string' is not assignable to par... Remove this comment to see the full error message
                notification.error("Failed to save some of selected items.");
            }
        });
    }, [dialog, selectedItems]);
    return (<Modal {...(dialog as any).props} className="select-items-dialog" width={width} title={dialogTitle} footer={<div className="d-flex align-items-center">
          <span className="flex-fill m-r-5" style={{ textAlign: "left", color: "rgba(0, 0, 0, 0.5)" }}>
            {extraFooterContent}
          </span>
          <Button {...(dialog as any).props.cancelButtonProps} onClick={(dialog as any).dismiss}>
            Cancel
          </Button>
          <Button {...(dialog as any).props.okButtonProps} onClick={save} disabled={selectedItems.length === 0 || (dialog as any).props.okButtonProps.disabled} type="primary">
            Save
            {showCount && !isEmpty(selectedItems) ? ` (${size(selectedItems)})` : null}
          </Button>
        </div>}>
      <div className="d-flex align-items-center m-b-10">
        <div className="flex-fill">
          {/* @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable. */}
          <Input.Search onChange={event => search(event.target.value)} placeholder={inputPlaceholder} autoFocus/>
        </div>
        {renderStagedItem && (<div className="w-50 m-l-20">
            <h5 className="m-0">{selectedItemsTitle}</h5>
          </div>)}
      </div>

      <div className="d-flex align-items-stretch" style={{ minHeight: "30vh", maxHeight: "50vh" }}>
        <div className="flex-fill scrollbox">
          {isLoading && <LoadingState className=""/>}
          {!isLoading && !hasResults && (<BigMessage icon="fa-search" message="No items match your search." className=""/>)}
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean | ((searchTerm: any) => void) | null... Remove this comment to see the full error message */}
          {!isLoading && hasResults && (<ItemsList items={items} renderItem={(item: any) => renderItem(item, { isSelected: isItemSelected(item) })} onItemClick={toggleItem}/>)}
        </div>
        {renderStagedItem && (<div className="w-50 m-l-20 scrollbox">
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type '(item: any) => any' is not assignable to typ... Remove this comment to see the full error message */}
            {selectedItems.length > 0 && (<ItemsList items={selectedItems} renderItem={(item: any) => renderStagedItem(item, { isSelected: true })} onItemClick={toggleItem}/>)}
          </div>)}
      </div>
    </Modal>);
}
SelectItemsDialog.defaultProps = {
    dialogTitle: "Add Items",
    inputPlaceholder: "Search...",
    selectedItemsTitle: "Selected items",
    itemKey: (item: any) => item.id,
    renderItem: () => "",
    renderStagedItem: null,
    width: "80%",
    extraFooterContent: null,
    showCount: false,
};
export default wrapDialog(SelectItemsDialog);
