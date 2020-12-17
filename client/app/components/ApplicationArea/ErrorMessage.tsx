import { get, isObject } from "lodash";
import React from "react";
import "./ErrorMessage.less";
import DynamicComponent from "@/components/DynamicComponent";
import { ErrorMessageDetails } from "@/components/ApplicationArea/ErrorMessageDetails";
function getErrorMessageByStatus(status: any, defaultMessage: any) {
    switch (status) {
        case 404:
            return "It seems like the page you're looking for cannot be found.";
        case 401:
        case 403:
            return "It seems like you don’t have permission to see this page.";
        default:
            return defaultMessage;
    }
}
function getErrorMessage(error: any) {
    const message = "It seems like we encountered an error. Try refreshing this page or contact your administrator.";
    if (isObject(error)) {
        // HTTP errors
        if ((error as any).isAxiosError && isObject((error as any).response)) {
            return getErrorMessageByStatus((error as any).response.status, get(error, "response.data.message", message));
        }
        // Router errors
        if ((error as any).status) {
            return getErrorMessageByStatus((error as any).status, message);
        }
    }
    return message;
}
type Props = {
    error: any;
    message?: string;
};
export default function ErrorMessage({ error, message }: Props) {
    if (!error) {
        return null;
    }
    console.error(error);
    const errorDetailsProps = {
        error,
        message: message || getErrorMessage(error),
    };
    return (<div className="error-message-container" data-test="ErrorMessage" role="alert">
      <div className="error-state bg-white tiled">
        <div className="error-state__icon">
          <i className="zmdi zmdi-alert-circle-o"/>
        </div>
        <div className="error-state__details">
          <DynamicComponent name="ErrorMessageDetails" fallback={<ErrorMessageDetails {...errorDetailsProps}/>} {...errorDetailsProps}/>
        </div>
      </div>
    </div>);
}
