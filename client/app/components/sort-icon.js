export default function init(ngModule) {
  ngModule.component('sortIcon', {
    template: '<span ng-if="$ctrl.showIcon"><i class="fa fa-sort-{{$ctrl.icon}}"></i></span>',
    bindings: {
      column: '<',
      sortColumn: '<',
      reverse: '<',
    },
    controller() {
      this.$onChanges = (changes) => {
        ['column', 'sortColumn', 'reverse'].forEach((v) => {
          if (v in changes) {
            this[v] = changes[v].currentValue;
          }
        });

        this.showIcon = false;

        if (this.column === this.sortColumn) {
          this.showIcon = true;
          this.icon = this.reverse ? 'desc' : 'asc';
        }
      };
    },
  });
}

init.init = true;

