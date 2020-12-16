import { filter, includes, intersection } from "lodash";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import Checkbox from "antd/lib/checkbox";
import { Columns } from "../components/ItemsTable";

export default function useItemsListExtraActions(controller, listColumns, ExtraActionsComponent) {
  const [actionsState, setActionsState] = useState({ isAvailable: false });
  const [selectedItems, setSelectedItems] = useState([]);

  // clear selection when page changes
  useEffect(() => {
    setSelectedItems([]);
  }, [controller.pageItems, actionsState.isAvailable]);

  const areAllItemsSelected = useMemo(() => {
    const allItems = controller.pageItems;
    if (allItems.length === 0 || selectedItems.length === 0) {
      return false;
    }
    return intersection(selectedItems, allItems).length === allItems.length;
  }, [selectedItems, controller.pageItems]);

  const toggleAllItems = useCallback(() => {
    if (areAllItemsSelected) {
      setSelectedItems([]);
    } else {
      setSelectedItems(controller.pageItems);
    }
  }, [areAllItemsSelected, controller.pageItems]);

  const toggleItem = useCallback(
    item => {
      if (includes(selectedItems, item)) {
        setSelectedItems(filter(selectedItems, s => s !== item));
      } else {
        setSelectedItems([...selectedItems, item]);
      }
    },
    [selectedItems]
  );

  const checkboxColumn = useMemo(
    () =>
      Columns.custom(
        (text, item) => <Checkbox checked={includes(selectedItems, item)} onChange={() => toggleItem(item)} />,
        {
          title: () => <Checkbox checked={areAllItemsSelected} onChange={toggleAllItems} />,
          field: "id",
          width: "1%",
        }
      ),
    [selectedItems, areAllItemsSelected, toggleAllItems, toggleItem]
  );

  const Component = useCallback(
    function ItemsListExtraActionsComponentWrapper(props) {
      // this check mostly needed to avoid eslint exhaustive deps warning
      if (!ExtraActionsComponent) {
        return null;
      }

      return <ExtraActionsComponent onStateChange={setActionsState} {...props} />;
    },
    [ExtraActionsComponent]
  );

  return useMemo(
    () => ({
      areExtraActionsAvailable: actionsState.isAvailable,
      listColumns: actionsState.isAvailable ? [checkboxColumn, ...listColumns] : listColumns,
      Component,
      selectedItems,
      setSelectedItems,
    }),
    [actionsState, listColumns, checkboxColumn, selectedItems, Component]
  );
}
