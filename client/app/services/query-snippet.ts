import { axios } from "@/services/axios";
import { extend, map } from "lodash";

class QuerySnippet {
  description: any;
  snippet: any;
  trigger: any;
  constructor(querySnippet: any) {
    extend(this, querySnippet);
  }

  getSnippet() {
    let name = this.trigger;
    if (this.description !== "") {
      name = `${this.trigger}: ${this.description}`;
    }

    return {
      name,
      content: this.snippet,
      tabTrigger: this.trigger,
    };
  }
}

const getQuerySnippet = (querySnippet: any) => new QuerySnippet(querySnippet);

const QuerySnippetService = {
  get: (data: any) => axios.get(`api/query_snippets/${data.id}`).then(getQuerySnippet),
  query: () => axios.get("api/query_snippets").then(data => map(data, getQuerySnippet)),
  create: (data: any) => axios.post("api/query_snippets", data).then(getQuerySnippet),
  save: (data: any) => axios.post(`api/query_snippets/${data.id}`, data).then(getQuerySnippet),
  delete: (data: any) => axios.delete(`api/query_snippets/${data.id}`),
};

export default QuerySnippetService;
