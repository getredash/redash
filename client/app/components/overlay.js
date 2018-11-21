const Overlay = {
  template: `
  <div>
    <div class="overlay"></div>
    <div style="width: 100%; position:absolute; top:50px; z-index:2000">
      <div class="well well-lg" style="width: 70%; margin: auto;" ng-transclude>
      </div>
    </div>
  </div>
  `,
  transclude: true,
};

export default function init(ngModule) {
  ngModule.component('overlay', Overlay);
}

init.init = true;
