class PaginatorCtrl {
  constructor() {
    this.page = this.paginator.page;
  }
  pageChanged() {
    this.paginator.setPage(this.page);
  }
}

export default function (ngModule) {
  ngModule.component('paginator', {
    template: `
<div class="text-center">
  <ul uib-pagination total-items="$ctrl.paginator.totalCount"
                     items-per-page="$ctrl.paginator.itemsPerPage"
                     ng-model="$ctrl.page"
                     max-size="6"
                     class="pagination"
                     boundary-link-numbers="true"
                     rotate="false"
                     next-text='>'
                     previous-text='<'
                     ng-change="$ctrl.pageChanged()"></ul>
</div>
    `,
    bindings: {
      paginator: '<',
    },
    controller: PaginatorCtrl,
  });
}
