import { isNull, isObject, isFunction, isUndefined, isEqual, has, omit, isArray, each } from "lodash";
class Parameter {
    $$value: any;
    global: any;
    locals: any;
    name: any;
    parentQueryId: any;
    pendingValue: any;
    title: any;
    type: any;
    urlPrefix: any;
    value: any;
    constructor(parameter: any, parentQueryId: any) {
        this.title = parameter.title;
        this.name = parameter.name;
        this.type = parameter.type;
        this.global = parameter.global; // backward compatibility in Widget service
        this.parentQueryId = parentQueryId;
        // Used for meta-parameters (i.e. dashboard-level params)
        this.locals = [];
        // Used for URL serialization
        this.urlPrefix = "p_";
    }
    static getExecutionValue(param: any, extra = {}) {
        if (!isObject(param) || !isFunction((param as any).getExecutionValue)) {
            return null;
        }
        return (param as any).getExecutionValue(extra);
    }
    static setValue(param: any, value: any) {
        if (!isObject(param) || !isFunction((param as any).setValue)) {
            return null;
        }
        return (param as any).setValue(value);
    }
    get isEmpty() {
        return isNull(this.normalizedValue);
    }
    get hasPendingValue() {
        return this.pendingValue !== undefined && !isEqual(this.pendingValue, this.normalizedValue);
    }
    /** Get normalized value to be used in inputs */
    get normalizedValue() {
        return this.$$value;
    }
    isEmptyValue(value: any) {
        return isNull(this.normalizeValue(value));
    }
    // eslint-disable-next-line class-methods-use-this
    normalizeValue(value: any) {
        if (isUndefined(value)) {
            return null;
        }
        return value;
    }
    updateLocals() {
        if (isArray(this.locals)) {
            each(this.locals, local => {
                local.setValue(this.value);
            });
        }
    }
    setValue(value: any) {
        const normalizedValue = this.normalizeValue(value);
        this.value = normalizedValue;
        this.$$value = normalizedValue;
        this.updateLocals();
        this.clearPendingValue();
        return this;
    }
    /** Get execution value for a query */
    getExecutionValue() {
        return this.value;
    }
    setPendingValue(value: any) {
        this.pendingValue = this.normalizeValue(value);
    }
    applyPendingValue() {
        if (this.hasPendingValue) {
            this.setValue(this.pendingValue);
        }
    }
    clearPendingValue() {
        this.pendingValue = undefined;
    }
    /** Update URL with Parameter value */
    toUrlParams() {
        const prefix = this.urlPrefix;
        // `null` removes the parameter from the URL in case it exists
        return {
            [`${prefix}${this.name}`]: !this.isEmpty ? this.value : null,
        };
    }
    /** Set parameter value from the URL */
    fromUrlParams(query: any) {
        const prefix = this.urlPrefix;
        const key = `${prefix}${this.name}`;
        if (has(query, key)) {
            this.setValue(query[key]);
        }
    }
    toQueryTextFragment() {
        return `{{ ${this.name} }}`;
    }
    /** Get a saveable version of the Parameter by omitting unnecessary props */
    toSaveableObject() {
        return omit(this, ["$$value", "urlPrefix", "pendingValue", "parentQueryId"]);
    }
}
export default Parameter;
