import { map } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import classNames from 'classnames';
import getTags from '@/services/getTags';

export class TagsList extends React.Component {
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
    getTags(this.props.tagsUrl).then((allTags) => {
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
      if (selectedTags.has(tag) && (selectedTags.size === 1)) {
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
        <div className="list-group m-t-10 tags-list tiled">
          {map(allTags, tag => (
            <a
              key={tag.name}
              href="javascript:void(0)"
              className={classNames('list-group-item', 'max-character', { active: selectedTags.has(tag.name) })}
              onClick={event => this.toggleTag(event, tag.name)}
            >
              <span className="badge badge-light">{tag.count}</span>
              <span className="tags-list__name">{tag.name}</span>
            </a>
          ))}
        </div>
      );
    }
    return null;
  }
}

export default function init(ngModule) {
  ngModule.component('tagsList', react2angular(TagsList));
}

init.init = true;
