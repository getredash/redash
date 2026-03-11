import React from "react";

interface ErrorMessageProps {
  error: Error;
  message?: string;
}

declare function ErrorMessage(props: ErrorMessageProps): React.JSX.Element | null;

export default ErrorMessage;
