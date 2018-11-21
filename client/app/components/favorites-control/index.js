const template = `
  <a href="javascript:void(0)" class="btn-favourite" 
    ng-click="$ctrl.toggleItem($event, $ctrl.item)"
    ng-attr-title="{{ $ctrl.item.is_favorite ? 'Remove from favorites' : 'Add to favorites' }}">
    <i class="fa" ng-class="{
      'fa-star-o': !$ctrl.item.is_favorite, 
      'fa-star': $ctrl.item.is_favorite,
      }" 
      aria-hidden="true"></i>
  </a>
`;

export default function init(ngModule) {
  ngModule.component('favoritesControl', {
    template,
    bindings: {
      item: '=',
    },
    controller($rootScope) {
      this.toggleItem = ($event, item) => {
        $event.preventDefault();
        $event.stopPropagation();
        if (item) {
          if (item.is_favorite) {
            item.$unfavorite().then(() => {
              item.is_favorite = false;
              $rootScope.$broadcast('reloadFavorites');
            });
          } else {
            item.$favorite().then(() => {
              item.is_favorite = true;
              $rootScope.$broadcast('reloadFavorites');
            });
          }
        }
      };
    },
  });
}

init.init = true;
