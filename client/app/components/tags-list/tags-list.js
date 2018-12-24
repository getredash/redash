import getTags from '@/services/getTags';
import template from './tags-list.html';

class TagsList {
  constructor() {
    // An array of objects that with the name and count of the tagged items
    this.allTags = [];
    // A set of tag names
    this.selectedTags = new Set();
    getTags(this.tagsUrl).then((tags) => {
      this.allTags = tags;
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

init.init = true;

