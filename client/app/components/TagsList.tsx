import { map, includes, difference } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import Badge from "antd/lib/badge";
import Menu from "antd/lib/menu";
import getTags from "@/services/getTags";

import "./TagsList.less";

const UNSELECT_ALL_KEY = "###Redash::TagsList::UnselectAll###";

type Tag = {
  name: string;
  count?: number;
};

type TagsListProps = {
  tagsUrl: string;
  showUnselectAll: boolean;
  unselectAllButtonTitle: string;
  onUpdate?: (selectedTags: string[]) => void;
};

function TagsList({
  tagsUrl,
  showUnselectAll = false,
  unselectAllButtonTitle = "Unselect All",
  onUpdate,
}: TagsListProps): JSX.Element | null {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    let isCancelled = false;

    getTags(tagsUrl).then(tags => {
      if (!isCancelled) {
        setAllTags(tags);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [tagsUrl]);

  const toggleTag = useCallback(
    (event, tag) => {
      let newSelectedTags;
      if (event.shiftKey) {
        // toggle tag
        if (includes(selectedTags, tag)) {
          newSelectedTags = difference(selectedTags, [tag]);
        } else {
          newSelectedTags = [...selectedTags, tag];
        }
      } else {
        // if the tag is the only selected, deselect it, otherwise select only it
        if (includes(selectedTags, tag) && selectedTags.length === 1) {
          newSelectedTags = [];
        } else {
          newSelectedTags = [tag];
        }
      }

      setSelectedTags(newSelectedTags);
      if (onUpdate) {
        onUpdate([...newSelectedTags]);
      }
    },
    [selectedTags, onUpdate]
  );

  const unselectAll = useCallback(() => {
    setSelectedTags([]);
    if (onUpdate) {
      onUpdate([]);
    }
  }, [onUpdate]);

  if (allTags.length === 0) {
    return null;
  }

  const selectedMenuItems = selectedTags.length > 0 ? selectedTags : [UNSELECT_ALL_KEY];

  return (
    <div className="m-t-10 tags-list tiled">
      <Menu className="invert-stripe-position" mode="inline" selectedKeys={selectedMenuItems}>
        {showUnselectAll && (
          <Menu.Item key={UNSELECT_ALL_KEY} className="m-0">
            <a className="d-flex align-items-center justify-content-between" onClick={unselectAll}>
              <span className="max-character col-xs-11">{unselectAllButtonTitle}</span>
            </a>
          </Menu.Item>
        )}
        {map(allTags, tag => (
          <Menu.Item key={tag.name} className="m-0">
            <a
              className="d-flex align-items-center justify-content-between"
              onClick={event => toggleTag(event, tag.name)}>
              <span className="max-character col-xs-11">{tag.name}</span>
              <Badge count={tag.count} />
            </a>
          </Menu.Item>
        ))}
      </Menu>
    </div>
  );
}

export default TagsList;
