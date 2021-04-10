import React from "react";

export interface WithIconProps {
  children?: string;
  icon: JSX.Element;
  alt: string;
}

export function withIcon<ComponentProps extends object>(Component: React.ComponentType<ComponentProps>) {
  return class WithIcon extends React.Component<ComponentProps & WithIconProps> {
    render() {
      const { children, icon, alt, ...props } = this.props;
      return (
        <Component {...(props as ComponentProps)}>
          {children}
          {children && " "}
          {icon} <span className="sr-only">{alt}</span>
        </Component>
      );
    }
  };
}

/**
 * Accessible wrapper for adding icons to a component.
 * Defaults to the external icon.
 */
export function WithIcon({
  icon = <i className="fa fa-external-link" aria-hidden="true" />,
  alt = "(opens in a new tab)",
  children,
  ...props
}: Partial<WithIconProps> & React.ComponentProps<"span">) {
  return (
    <span {...props}>
      {children}
      {children && " "}
      {icon} <span className="sr-only">{alt}</span>
    </span>
  );
}
