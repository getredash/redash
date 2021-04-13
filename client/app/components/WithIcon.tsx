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

export const WithInlineIcon = withIcon((props: React.PropsWithChildren<React.HTMLAttributes<HTMLSpanElement>>) => {
  return <span {...props} />;
});

export const WithExternalIcon = ({
  icon = <i className="fa fa-external-link" aria-hidden="true" />,
  alt = "(opens in a new tab)",
  ...props
}: Partial<WithIconProps> & React.HTMLAttributes<HTMLSpanElement>) => {
  return <WithInlineIcon icon={icon} alt={alt} {...props} />;
};
