import { map, includes, difference } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import Badge from "antd/lib/badge";
import Menu from "antd/lib/menu";
import CloseOutlinedIcon from "@ant-design/icons/CloseOutlined";
import getTags from "@/services/getTags";
import PlainButton from "@/components/PlainButton";

import "./TagsList.less";

type Tag = {
  name: string;
  count?: number;
};

type TagsListProps = {
  tagsUrl: string;
  showUnselectAll: boolean;
  onUpdate?: (selectedTags: string[]) => void;
};

function TagsList({ tagsUrl, showUnselectAll = false, onUpdate }: TagsListProps): JSX.Element | null {
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

  return (
    <div className="tags-list">
      <div className="tags-list-title">
        <span className="tags-list-label">Tags</span>
        {showUnselectAll && selectedTags.length > 0 && (
          <PlainButton type="link" onClick={unselectAll}>
            <CloseOutlinedIcon />
            clear selection
          </PlainButton>
        )}
      </div>

      <div className="tiled">
        <Menu className="invert-stripe-position" mode="inline" selectedKeys={selectedTags}>
          {map(allTags, tag => (
            <Menu.Item key={tag.name} className="m-0">
              <PlainButton
                className="d-flex align-items-center justify-content-between"
                onClick={event => toggleTag(event, tag.name)}>
                <span className="max-character col-xs-11">{tag.name}</span>
                <Badge count={tag.count} />
              </PlainButton>
            </Menu.Item>
          ))}
        </Menu>
      </div>
    </div>
  );
}

export default TagsList;
