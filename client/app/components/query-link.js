export default function init(ngModule) {
  ngModule.component('queryLink', {
    bindings: {
      query: '<',
      visualization: '<',
      readonly: '<',
    },
    template: `
      <a ng-href="{{$ctrl.readonly ? undefined : $ctrl.getUrl()}}" class="query-link">
        <visualization-name visualization="$ctrl.visualization"/>
        <span>{{$ctrl.query.name}}</span>
      </a>
    `,
    controller() {
      this.getUrl = () => {
        let hash = null;
        if (this.visualization) {
          if (this.visualization.type === 'TABLE') {
            // link to hard-coded table tab instead of the (hidden) visualization tab
            hash = 'table';
          } else {
            hash = this.visualization.id;
          }
        }

        return this.query.getUrl(false, hash);
      };
    },
  });
}

init.init = true;
