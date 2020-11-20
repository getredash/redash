import {
  isNull,
  isUndefined,
  isArray,
  isEmpty,
  get,
  map,
  join,
  has,
  toString,
  findKey,
  mapValues,
  pickBy,
} from "lodash";
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
    this.setValue(parameter.value);
  }

  get searchColumn() {
    return findKey(this.parameterMapping, { mappingType: QueryBasedParameterMappingType.DROPDOWN_SEARCH });
  }

  get staticParams() {
    const staticParams = pickBy(
      this.parameterMapping,
      mapping => mapping.mappingType === QueryBasedParameterMappingType.STATIC
    );
    return mapValues(staticParams, value => value.staticValue);
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
      const queryKey = query[key];
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

  loadDropdownValues(initialSearchTerm = null) {
    return Query.get({ id: this.queryId })
      .then(query => {
        const queryHasParameters = query.hasParameters();
        if (queryHasParameters && this.searchColumn) {
          this.searchFunction = searchTerm =>
            QueryResult.getByQueryId(query.id, { ...this.staticParams, [this.searchColumn]: searchTerm }, -1)
              .toPromise()
              .then(result => get(result, "query_result.data.rows"))
              .then(mapOptionValuesToString)
              .catch(() => Promise.resolve([]));
          return initialSearchTerm ? this.searchFunction(initialSearchTerm) : Promise.resolve([]);
        } else {
          this.searchFunction = null;
        }

        if (queryHasParameters) {
          return QueryResult.getByQueryId(query.id, { ...this.staticParams }, -1)
            .toPromise()
            .then(result => get(result, "query_result.data.rows"));
        } else if (this.parentQueryId) {
          return Query.associatedDropdown({ queryId: this.parentQueryId, dropdownQueryId: this.queryId });
        }
        return Query.asDropdown({ id: this.queryId });
      })
      .then(mapOptionValuesToString)
      .catch(() => Promise.resolve([]));
  }
}

export default QueryBasedDropdownParameter;
