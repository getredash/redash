import { map } from "lodash";
import React from "react";
import PropTypes from "prop-types";
import Badge from "antd/lib/badge";
import Menu from "antd/lib/menu";
import getTags from "@/services/getTags";

import "./TagsList.less";

export default class TagsList extends React.Component {
  static propTypes = {
    tagsUrl: PropTypes.string.isRequired,
    onUpdate: PropTypes.func,
  };

  static defaultProps = {
    onUpdate: () => {},
  };

  constructor(props) {
    super(props);

    this.state = {
      // An array of objects that with the name and count of the tagged items
      allTags: [],
      // A set of tag names
      selectedTags: new Set(),
    };
  }

  componentDidMount() {
    getTags(this.props.tagsUrl).then(allTags => {
      this.setState({ allTags });
    });
  }

  toggleTag(event, tag) {
    const { selectedTags } = this.state;
    if (event.shiftKey) {
      // toggle tag
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
      } else {
        selectedTags.add(tag);
      }
    } else {
      // if the tag is the only selected, deselect it, otherwise select only it
      if (selectedTags.has(tag) && selectedTags.size === 1) {
        selectedTags.clear();
      } else {
        selectedTags.clear();
        selectedTags.add(tag);
      }
    }
    this.forceUpdate();

    this.props.onUpdate([...this.state.selectedTags]);
  }

  render() {
    const { allTags, selectedTags } = this.state;
    if (allTags.length > 0) {
      return (
        <div className="m-t-10 tags-list tiled">
          <Menu className="invert-stripe-position" mode="inline" selectedKeys={[...selectedTags]}>
            {map(allTags, tag => (
              <Menu.Item key={tag.name} className="m-0">
                <a
                  className="d-flex align-items-center justify-content-between"
                  onClick={event => this.toggleTag(event, tag.name)}>
                  <span className="max-character col-xs-11">{tag.name}</span>
                  <Badge count={tag.count} />
                </a>
              </Menu.Item>
            ))}
          </Menu>
        </div>
      );
    }
    return null;
  }
}
