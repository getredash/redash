export let QuerySnippet = null; // eslint-disable-line import/no-mutable-exports

function QuerySnippetService($resource) {
  const resource = $resource("api/query_snippets/:id", { id: "@id" });
  resource.prototype.getSnippet = function getSnippet() {
    let name = this.trigger;
    if (this.description !== "") {
      name = `${this.trigger}: ${this.description}`;
    }

    return {
      name,
      content: this.snippet,
      tabTrigger: this.trigger,
    };
  };

  return resource;
}

export default function init(ngModule) {
  ngModule.factory("QuerySnippet", QuerySnippetService);

  ngModule.run($injector => {
    QuerySnippet = $injector.get("QuerySnippet");
  });
}

init.init = true;
