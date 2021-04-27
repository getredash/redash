import React from "react";

export type IconTextProps<WrapperProps = {}, WrapperType = keyof JSX.IntrinsicElements | React.FC<WrapperProps>> = {
  wrapper?: WrapperType;
  children?: React.ReactText;
  icon: JSX.Element;
  alt: string;
} & (WrapperType extends string ? React.HTMLAttributes<HTMLElement> : WrapperProps);

export function IconText<WrapperProps>({
  icon,
  alt,
  children,
  wrapper = "span",
  ...props
}: IconTextProps<WrapperProps>) {
  return React.createElement(
    wrapper,
    props as WrapperProps,
    <>
      {children}
      {children && " "}
      {icon} <span className="sr-only">{alt}</span>
    </>
  );
}

export function ExternalIconText<WrapperProps>({
  icon = <i className="fa fa-external-link" aria-hidden="true" />,
  alt = "(opens in a new tab)",
  ...props
}: Partial<IconTextProps<WrapperProps>>) {
  return <IconText icon={icon} alt={alt} {...props} />;
}
