import { isFunction } from 'lodash';
import React from 'react';
import PropTypes from 'prop-types';
import { react2angular } from 'react2angular';
import { $rootScope } from '@/services/ng';

function toggleItem(event, item, callback) {
  event.preventDefault();
  event.stopPropagation();

  const action = item.is_favorite ? item.$unfavorite.bind(item) : item.$favorite.bind(item);
  const savedIsFavorite = item.is_favorite;

  action().then(() => {
    item.is_favorite = !savedIsFavorite;
    $rootScope.$broadcast('reloadFavorites');
    if (isFunction(callback)) {
      callback();
    }
  });
}

export function FavoritesControl({ item, onChange }) {
  const icon = item.is_favorite ? 'fa-star' : 'fa-star-o';
  const title = item.is_favorite ? 'Remove from favorites' : 'Add to favorites';
  return (
    <a
      href="javascript:void(0)"
      title={title}
      className="btn-favourite"
      onClick={event => toggleItem(event, item, onChange)}
    >
      <i className={'fa ' + icon} aria-hidden="true" />
    </a>
  );
}

FavoritesControl.propTypes = {
  item: PropTypes.shape({
    is_favorite: PropTypes.bool.isRequired,
  }).isRequired,
  onChange: PropTypes.func,
  // Force component update when `item` changes.
  // Remove this when `react2angular` will finally go to hell
  forceUpdate: PropTypes.string.isRequired, // eslint-disable-line react/no-unused-prop-types
};

FavoritesControl.defaultProps = {
  onChange: () => {},
};

export default function init(ngModule) {
  ngModule.component('favoritesControlImpl', react2angular(FavoritesControl));
  ngModule.component('favoritesControl', {
    template: `
      <favorites-control-impl 
        ng-if="$ctrl.item" 
        item="$ctrl.item" 
        on-change="$ctrl.onChange"
        force-update="$ctrl.forceUpdateTag"
      ></favorites-control-impl>
    `,
    bindings: {
      item: '=',
    },
    controller($scope) {
      // See comment for FavoritesControl.propTypes.forceUpdate
      this.forceUpdateTag = 'force' + Date.now();
      $scope.$on('reloadFavorites', () => {
        this.forceUpdateTag = 'force' + Date.now();
      });

      this.onChange = () => {
        $scope.$applyAsync();
      };
    },
  });
}

init.init = true;
