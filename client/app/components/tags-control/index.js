import { isObject, isArray, isFunction, map } from 'lodash';

import controlTemplate from './control-template.html';
import modalTemplate from './modal-template.html';

function trim(str) {
  return str.replace(/^\s+|\s+$/g, '');
}

export default function init(ngModule) {
  ngModule.component('tagsEditorModal', {
    template: modalTemplate,
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
    controller() {
      this.save = () => {
        this.close({
          $value: map(this.resolve.items, trim),
        });
      };
    },
  });

  ngModule.component('tagsControl', {
    template: controlTemplate,
    bindings: {
      item: '=',
      canEdit: '<',
      getAvailableTags: '<',
      onEdit: '&',
    },
    controller($q, $uibModal) {
      this.editTags = () => {
        let tags = [];
        if (isObject(this.item) && isArray(this.item.tags)) {
          tags = map(this.item.tags, trim);
        }

        let promise = $q.resolve([]);
        if (isFunction(this.getAvailableTags)) {
          promise = this.getAvailableTags();
        }
        promise.then((availableTags) => {
          availableTags = map(isArray(availableTags) ? availableTags : [], tag => trim(tag.name));
          $uibModal
            .open({
              component: 'tagsEditorModal',
              resolve: {
                items: () => tags,
                availableTags: () => availableTags,
              },
            })
            .result.then((newTags) => {
              if (isObject(this.item)) {
                this.item.tags = newTags;
                if (isFunction(this.onEdit)) {
                  this.onEdit();
                }
              }
            });
        });
      };
    },
  });

  ngModule.component('queryTagsControl', {
    template: `
      <div>
        <span class="label label-tag-unpublished" ng-if="$ctrl.query.is_draft && !$ctrl.query.is_archived">Unpublished</span
        ><span class="label label-tag-archived" ng-if="$ctrl.query.is_archived" 
          uib-popover="This query is archived and can't be used in dashboards, and won't appear in search results."
          popover-placement="right" popover-trigger="'mouseenter'">Archived</span
        ><tags-control item="$ctrl.query" can-edit="$ctrl.canEdit" 
          get-available-tags="$ctrl.getAvailableTags" on-edit="$ctrl.onEdit()"></tags-control>
      </div>
    `,
    bindings: {
      query: '=',
      canEdit: '<',
      getAvailableTags: '<',
      onEdit: '&',
    },
  });
}
