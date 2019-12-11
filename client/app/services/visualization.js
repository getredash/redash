export let Visualization = null; // eslint-disable-line import/no-mutable-exports

export default function init(ngModule) {
  ngModule.run($resource => {
    Visualization = $resource("api/visualizations/:id", { id: "@id" });
  });
}

init.init = true;
