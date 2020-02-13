import { isNull, isUndefined, isArray, isEmpty, get, map, join, has } from "lodash";
import { Query } from "@/services/query";
import QueryResult from "@/services/query-result";
import Parameter from "./Parameter";

class QueryBasedDropdownParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.queryId = parameter.queryId;
    this.multiValuesOptions = parameter.multiValuesOptions;
    this.searchTerm = parameter.searchTerm;
    this.setValue(parameter.value);
  }

  normalizeValue(value) {
    if (isUndefined(value) || isNull(value) || (isArray(value) && isEmpty(value))) {
      return null;
    }

    if (this.multiValuesOptions) {
      value = isArray(value) ? value : [value];
    } else {
      value = isArray(value) ? value[0] : value;
    }
    return value;
  }

  getExecutionValue(extra = {}) {
    const { joinListValues } = extra;
    if (joinListValues && isArray(this.value)) {
      const separator = get(this.multiValuesOptions, "separator", ",");
      const prefix = get(this.multiValuesOptions, "prefix", "");
      const suffix = get(this.multiValuesOptions, "suffix", "");
      const parameterValues = map(this.value, v => `${prefix}${v}${suffix}`);
      return join(parameterValues, separator);
    }
    return this.value;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;

    let urlParam = this.value;
    if (this.multiValuesOptions && isArray(this.value)) {
      urlParam = JSON.stringify(this.value);
    }

    return {
      [`${prefix}${this.name}`]: !this.isEmpty ? urlParam : null,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;
    if (has(query, key)) {
      if (this.multiValuesOptions) {
        try {
          const valueFromJson = JSON.parse(query[key]);
          this.setValue(isArray(valueFromJson) ? valueFromJson : query[key]);
        } catch (e) {
          this.setValue(query[key]);
        }
      } else {
        this.setValue(query[key]);
      }
    }
  }

  loadDropdownValues() {
    return Query.get({ id: this.queryId }).then(query => {
      if (query.hasParameters()) {
        this.searchFunction = searchTerm =>
          QueryResult.getByQueryId(query.id, { search: searchTerm }, 0)
            .toPromise()
            .then(result => {
              this.searchTerm = searchTerm;
              return get(result, "query_result.data.rows");
            });
        return this.searchTerm ? this.searchFunction(this.searchTerm) : Promise.resolve([]);
      } else {
        if (this.parentQueryId) {
          return Query.associatedDropdown({ queryId: this.parentQueryId, dropdownQueryId: this.queryId });
        }
        return Query.asDropdown({ id: this.queryId });
      }
    });
  }
}

export default QueryBasedDropdownParameter;
