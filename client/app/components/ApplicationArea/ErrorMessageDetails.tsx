import React from "react";

type Props = {
    error: any; // TODO: PropTypes.instanceOf(Error)
    message: string;
};

export function ErrorMessageDetails(props: Props) {
  return <h4>{props.message}</h4>;
}
