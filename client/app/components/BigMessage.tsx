import React from "react";

type OwnProps = {
    message?: string;
    icon: string;
    children?: React.ReactNode;
    className?: string;
};

type Props = OwnProps & typeof BigMessage.defaultProps;

function BigMessage({ message, icon, children, className }: Props) {
  return (
    <div className={"p-15 text-center " + className}>
      <h3 className="m-t-0 m-b-0">
        <i className={"fa " + icon} />
      </h3>
      <br />
      {message}
      {children}
    </div>
  );
}

BigMessage.defaultProps = {
  message: "",
  children: null,
  className: "tiled bg-white",
};

export default BigMessage;
