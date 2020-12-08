
import React from "react";

type Props = {
    type?: string;
    alt?: string;
};

export function QuerySourceTypeIcon(props: Props) {
  return <img src={`static/images/db-logos/${props.type}.png`} width="20" alt={props.alt} />;
}
