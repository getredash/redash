import { map, includes, difference } from "lodash";
import React, { useState, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import Badge from "antd/lib/badge";
import Menu from "antd/lib/menu";
import getTags from "@/services/getTags";

import "./TagsList.less";

export default function TagsList({ tagsUrl, onUpdate }) {
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

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
      onUpdate([...newSelectedTags]);
    },
    [selectedTags, onUpdate]
  );

  if (allTags.length === 0) {
    return null;
  }

  return (
    <div className="m-t-10 tags-list tiled">
      <Menu className="invert-stripe-position" mode="inline" selectedKeys={[...selectedTags]}>
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

TagsList.propTypes = {
  tagsUrl: PropTypes.string.isRequired,
  onUpdate: PropTypes.func,
};

TagsList.defaultProps = {
  onUpdate: () => {},
};
