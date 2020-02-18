import { isNull, isUndefined, isArray, isEmpty, isString, get, map, join, has, toString } from "lodash";
import { Query } from "@/services/query";
import QueryResult from "@/services/query-result";
import Parameter from "./Parameter";

function mapOptionValuesToString(options) {
  return map(options, option => ({ ...option, value: toString(option.value) }));
}

export const QueryBasedParameterMappingType = {
  DROPDOWN_SEARCH: "search",
  STATIC: "static",
  UNDEFINED: "undefined",
};

class QueryBasedDropdownParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.queryId = parameter.queryId;
    this.multiValuesOptions = parameter.multiValuesOptions;
    this.parameterMapping = parameter.parameterMapping;
    this.searchColumn = parameter.searchColumn;
    this.searchTerm = parameter.searchTerm;
    this.staticParams = { ...parameter.staticParams };
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
    const executionParamValues = { ...this.staticParams };
    if (isString(this.searchColumn)) {
      executionParamValues[this.searchColumn] = this.searchTerm;
    }
    return !isEmpty(executionParamValues) ? { value: this.value, executionParamValues } : this.value;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;

    let urlParam = this.value;
    if (this.multiValuesOptions && isArray(this.value)) {
      urlParam = JSON.stringify(this.value);
    }

    if (this.searchColumn) {
      urlParam = `${this.searchTerm}|-|${urlParam}`;
    }

    return {
      [`${prefix}${this.name}`]: !this.isEmpty ? urlParam : null,
    };
  }

  fromUrlParams(query) {
    const prefix = this.urlPrefix;
    const key = `${prefix}${this.name}`;
    if (has(query, key)) {
      let queryKey = query[key];
      if (this.searchColumn) {
        const searchTermAndValue = queryKey.split("|-|");
        if (searchTermAndValue.length === 2) {
          this.searchTerm = searchTermAndValue[0];
          queryKey = searchTermAndValue[1];
        }
      }

      if (this.multiValuesOptions) {
        try {
          const valueFromJson = JSON.parse(queryKey);
          this.setValue(isArray(valueFromJson) ? valueFromJson : queryKey);
        } catch (e) {
          this.setValue(queryKey);
        }
      } else {
        this.setValue(queryKey);
      }
    }
  }

  loadDropdownValues() {
    return Query.get({ id: this.queryId }).then(query => {
      if (query.hasParameters()) {
        this.searchFunction = searchTerm =>
          QueryResult.getByQueryId(query.id, { ...this.staticParams, search: searchTerm }, -1)
            .toPromise()
            .then(result => {
              this.searchTerm = searchTerm;
              return get(result, "query_result.data.rows");
            })
            .then(mapOptionValuesToString);
        return this.searchTerm ? this.searchFunction(this.searchTerm) : Promise.resolve([]);
      } else {
        if (this.parentQueryId) {
          return Query.associatedDropdown({ queryId: this.parentQueryId, dropdownQueryId: this.queryId }).then(
            mapOptionValuesToString
          );
        }
        return Query.asDropdown({ id: this.queryId }).then(mapOptionValuesToString);
      }
    });
  }
}

export default QueryBasedDropdownParameter;
