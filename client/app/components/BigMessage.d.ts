import React from "react";

interface BigMessageProps {
  message?: string;
  icon: string;
  children?: React.ReactNode;
  className?: string;
}

declare function BigMessage(props: BigMessageProps): React.JSX.Element;

export default BigMessage;
