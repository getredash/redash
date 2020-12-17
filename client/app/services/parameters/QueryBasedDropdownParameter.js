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
  filter,
  omit,
} from "lodash";
import { Query } from "@/services/query";
import QueryResult from "@/services/query-result";
import Parameter from "./Parameter";

function mapQueryResultToDropdownOptions(options) {
  return map(options, ({ label, name, value }) => ({ label: label || name, value: toString(value) }));
}

export const QueryBasedParameterMappingType = {
  DROPDOWN_SEARCH: "search",
  STATIC: "static",
  UNDEFINED: "undefined",
};

function extractOptionLabelsFromValues(values) {
  if (!isArray(values)) {
    values = [values];
  }

  const optionLabels = {};
  values.forEach(val => {
    if (has(val, "label") && has(val, "value")) {
      optionLabels[val.value] = val.label;
    }
  });

  return optionLabels;
}

class QueryBasedDropdownParameter extends Parameter {
  constructor(parameter, parentQueryId) {
    super(parameter, parentQueryId);
    this.queryId = parameter.queryId;
    this.multiValuesOptions = parameter.multiValuesOptions;
    this.parameterMapping = parameter.parameterMapping;
    this.$$optionLabels = extractOptionLabelsFromValues(parameter.value);
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

    if (this.searchColumn) {
      value = this._getLabeledValue(value);
    }
    return value;
  }

  setValue(value) {
    if (this.searchColumn) {
      value = this._getLabeledValue(value);
    }

    return super.setValue(value);
  }

  getExecutionValue(extra = {}) {
    const { joinListValues } = extra;
    let executionValue = this.value;
    if (isArray(executionValue)) {
      executionValue = map(executionValue, value => get(value, "value", value));

      if (joinListValues) {
        const separator = get(this.multiValuesOptions, "separator", ",");
        const prefix = get(this.multiValuesOptions, "prefix", "");
        const suffix = get(this.multiValuesOptions, "suffix", "");
        const parameterValues = map(executionValue, v => `${prefix}${v}${suffix}`);
        executionValue = join(parameterValues, separator);
      }
      return executionValue;
    }

    executionValue = get(executionValue, "value", executionValue);
    return executionValue;
  }

  toUrlParams() {
    const prefix = this.urlPrefix;

    if (this.searchColumn) {
      return;
    }

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

    if (this.searchColumn) {
      return;
    }

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

  _saveLabeledValuesFromOptions(options) {
    this.$$optionLabels = { ...this.$$optionLabels, ...extractOptionLabelsFromValues(options) };
    return options;
  }

  _getLabeledValue(value) {
    const getSingleLabeledValue = value => {
      value = get(value, "value", value);
      if (!(value in this.$$optionLabels)) {
        return null;
      }
      return { value, label: this.$$optionLabels[value] };
    };

    if (isArray(value)) {
      value = map(value, getSingleLabeledValue);
      return filter(value); // remove values without label
    }
    return getSingleLabeledValue(value);
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
              .then(mapQueryResultToDropdownOptions)
              .then(options => this._saveLabeledValuesFromOptions(options))
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
      .then(mapQueryResultToDropdownOptions)
      .catch(() => Promise.resolve([]));
  }

  toSaveableObject() {
    const saveableObject = super.toSaveableObject();
    return omit(saveableObject, ["$$optionLabels"]);
  }
}

export default QueryBasedDropdownParameter;
