import { map, sortBy } from 'underscore';
import template from './tags-list.html';

function processTags(tags) {
  tags = tags || {};
  return map(sortBy(map(tags, (count, tag) => ({ tag, count })), 'count'), item => item.tag);
}

class TagsList {
  constructor($http) {
    this.allTags = [];
    this.selectedTags = new Set();
    $http.get(this.tagsUrl).then((response) => {
      this.allTags = processTags(response.data);
    });
  }
  toggleTag($event, tag) {
    if ($event.shiftKey) {
      // toggle tag
      if (this.selectedTags.has(tag)) {
        this.selectedTags.delete(tag);
      } else {
        this.selectedTags.add(tag);
      }
    } else {
      // if the tag is the only selected, deselect it, otherwise select only it
      if (this.selectedTags.has(tag) && this.selectedTags.size === 1) {
        this.selectedTags.clear();
      } else {
        this.selectedTags.clear();
        this.selectedTags.add(tag);
      }
    }

    if (this.onTagsUpdate) {
      this.onTagsUpdate(this.selectedTags);
    }
  }
}

export default function init(ngModule) {
  ngModule.component('tagsList', {
    template,
    bindings: {
      tagsUrl: '@',
      onTagsUpdate: '=',
    },
    controller: TagsList,
  });
}
