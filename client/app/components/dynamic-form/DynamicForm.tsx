import React, { useState, useReducer, useCallback } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import Form from "antd/lib/form";
import Button from "antd/lib/button";
import { includes, isFunction, filter, find, difference, isEmpty, mapValues } from "lodash";
import notification from "@/services/notification";
import Collapse from "@/components/Collapse";
import DynamicFormField, { FieldType } from "./DynamicFormField";
import getFieldLabel from "./getFieldLabel";
import helper from "./dynamicFormHelper";
import "./DynamicForm.less";
type ActionType = {
    name: string;
    callback: (...args: any[]) => any;
    type?: string;
    pullRight?: boolean;
    disabledWhenDirty?: boolean;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ name: Validator<str... Remove this comment to see the full error message
const ActionType: PropTypes.Requireable<ActionType> = PropTypes.shape({
    name: PropTypes.string.isRequired,
    callback: PropTypes.func.isRequired,
    type: PropTypes.string,
    pullRight: PropTypes.bool,
    disabledWhenDirty: PropTypes.bool,
});
type AntdFormType = {
    validateFieldsAndScroll?: (...args: any[]) => any;
};
// @ts-expect-error ts-migrate(2322) FIXME: Type 'Requireable<InferProps<{ validateFieldsAndSc... Remove this comment to see the full error message
const AntdFormType: PropTypes.Requireable<AntdFormType> = PropTypes.shape({
    validateFieldsAndScroll: PropTypes.func,
});
const fieldRules = ({ type, required, minLength }: any) => {
    const requiredRule = required;
    const minLengthRule = minLength && includes(["text", "email", "password"], type);
    const emailTypeRule = type === "email";
    return [
        requiredRule && { required, message: "This field is required." },
        minLengthRule && { min: minLength, message: "This field is too short." },
        emailTypeRule && { type: "email", message: "This field must be a valid email." },
    ].filter(rule => rule);
};
function normalizeEmptyValuesToNull(fields: any, values: any) {
    return mapValues(values, (value, key) => {
        const { initialValue } = find(fields, { name: key }) || {};
        if ((initialValue === null || initialValue === undefined || initialValue === "") && value === "") {
            return null;
        }
        return value;
    });
}
type OwnDynamicFormFieldsProps = {
    fields?: FieldType[];
    feedbackIcons?: boolean;
    form: AntdFormType;
};
type DynamicFormFieldsProps = OwnDynamicFormFieldsProps & typeof DynamicFormFields.defaultProps;
function DynamicFormFields({ fields, feedbackIcons, form }: DynamicFormFieldsProps) {
    return fields.map(field => {
        const { name, type, initialValue, contentAfter } = field;
        const fieldLabel = getFieldLabel(field);
        const formItemProps = {
            name,
            className: "m-b-10",
            hasFeedback: type !== "checkbox" && type !== "file" && feedbackIcons,
            label: type === "checkbox" ? "" : fieldLabel,
            rules: fieldRules(field),
            valuePropName: type === "checkbox" ? "checked" : "value",
            initialValue,
        };
        if (type === "file") {
            formItemProps.valuePropName = "data-value";
            (formItemProps as any).getValueFromEvent = (e: any) => {
                if (e && e.fileList[0]) {
                    helper.getBase64(e.file).then(value => {
                        (form as any).setFieldsValue({ [name]: value });
                    });
                }
                return undefined;
            };
        }
        return (<React.Fragment key={name}>
        <Form.Item {...formItemProps}>
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type '{ field: FieldType; form: AntdFormType; }' i... Remove this comment to see the full error message */}
          <DynamicFormField field={field} form={form}/>
        </Form.Item>
        {isFunction(contentAfter) ? contentAfter((form as any).getFieldValue(name)) : contentAfter}
      </React.Fragment>);
    });
}
DynamicFormFields.defaultProps = {
    fields: [],
    feedbackIcons: false,
};
const reducerForActionSet = (state: any, action: any) => {
    if (action.inProgress) {
        state.add(action.actionName);
    }
    else {
        state.delete(action.actionName);
    }
    return new Set(state);
};
type OwnDynamicFormActionsProps = {
    actions?: ActionType[];
    isFormDirty?: boolean;
};
type DynamicFormActionsProps = OwnDynamicFormActionsProps & typeof DynamicFormActions.defaultProps;
function DynamicFormActions({ actions, isFormDirty }: DynamicFormActionsProps) {
    const [inProgressActions, setActionInProgress] = useReducer(reducerForActionSet, new Set());
    const handleAction = useCallback(action => {
        const actionName = action.name;
        if (isFunction(action.callback)) {
            setActionInProgress({ actionName, inProgress: true });
            action.callback(() => {
                setActionInProgress({ actionName, inProgress: false });
            });
        }
    }, []);
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string | undefined' is not assignable to typ... Remove this comment to see the full error message
    return actions.map(action => (<Button key={action.name} htmlType="button" className={cx("m-t-10", { "pull-right": action.pullRight })} type={action.type} disabled={isFormDirty && action.disableWhenDirty} loading={inProgressActions.has(action.name)} onClick={() => handleAction(action)}>
      {action.name}
    </Button>));
}
DynamicFormActions.defaultProps = {
    actions: [],
    isFormDirty: false,
};
type OwnDynamicFormProps = {
    id?: string;
    fields?: FieldType[];
    actions?: ActionType[];
    feedbackIcons?: boolean;
    hideSubmitButton?: boolean;
    defaultShowExtraFields?: boolean;
    saveText?: string;
    onSubmit?: (...args: any[]) => any;
};
type DynamicFormProps = OwnDynamicFormProps & typeof DynamicForm.defaultProps;
export default function DynamicForm({ id, fields, actions, feedbackIcons, hideSubmitButton, defaultShowExtraFields, saveText, onSubmit, }: DynamicFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showExtraFields, setShowExtraFields] = useState(defaultShowExtraFields);
    const [form] = Form.useForm();
    const extraFields = filter(fields, { extra: true });
    const regularFields = difference(fields, extraFields);
    const handleFinish = useCallback(values => {
        setIsSubmitting(true);
        values = normalizeEmptyValuesToNull(fields, values);
        // @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable.
        onSubmit(values, (msg: any) => {
            const { setFieldsValue, getFieldsValue } = form;
            setIsSubmitting(false);
            setFieldsValue(getFieldsValue()); // reset form touched state
            notification.success(msg);
        }, (msg: any) => {
            setIsSubmitting(false);
            notification.error(msg);
        });
    }, [form, fields, onSubmit]);
    const handleFinishFailed = useCallback(({ errorFields }) => {
        form.scrollToField(errorFields[0].name);
    }, [form]);
    return (<Form form={form} id={id} className="dynamic-form" layout="vertical" onFinish={handleFinish} onFinishFailed={handleFinishFailed}>
      {/* @ts-expect-error ts-migrate(2786) FIXME: 'DynamicFormFields' cannot be used as a JSX compon... Remove this comment to see the full error message */}
      <DynamicFormFields fields={regularFields} feedbackIcons={feedbackIcons} form={form}/>
      {!isEmpty(extraFields) && (<div className="extra-options">
          {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'boolean' is not assignable to type 'never'. */}
          <Button type="dashed" block className="extra-options-button" onClick={() => setShowExtraFields(currentShowExtraFields => !currentShowExtraFields)}>
            Additional Settings
            <i className={cx("fa m-l-5", { "fa-caret-up": showExtraFields, "fa-caret-down": !showExtraFields })}/>
          </Button>
          <Collapse collapsed={!showExtraFields} className="extra-options-content">
            {/* @ts-expect-error ts-migrate(2322) FIXME: Type 'Element' is not assignable to type 'null | u... Remove this comment to see the full error message */}
            <DynamicFormFields fields={extraFields} feedbackIcons={feedbackIcons} form={form}/>
          </Collapse>
        </div>)}
      {!hideSubmitButton && (<Button className="w-100 m-t-20" type="primary" htmlType="submit" disabled={isSubmitting}>
          {saveText}
        </Button>)}
      {/* @ts-expect-error ts-migrate(2786) FIXME: 'DynamicFormActions' cannot be used as a JSX compo... Remove this comment to see the full error message */}
      <DynamicFormActions actions={actions} isFormDirty={form.isFieldsTouched()}/>
    </Form>);
}
DynamicForm.defaultProps = {
    id: null,
    fields: [],
    actions: [],
    feedbackIcons: false,
    hideSubmitButton: false,
    defaultShowExtraFields: false,
    saveText: "Save",
    onSubmit: () => { },
};
