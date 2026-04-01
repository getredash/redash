import React from "react";

export declare const TYPES: Record<string, [string, string]>;

type HelpTriggerDomProps = Omit<React.HTMLAttributes<HTMLElement>, "children" | "className" | "title">;

export interface HelpTriggerProps extends HelpTriggerDomProps {
  type?: string | null;
  href?: string | null;
  title?: React.ReactNode;
  className?: string | null;
  showTooltip?: boolean;
  renderAsLink?: boolean;
  children?: React.ReactNode;
}

export declare function helpTriggerWithTypes(
  types: Record<string, [string, string]>,
  allowedDomains?: string[],
  drawerClassName?: string | null
): React.ComponentType<HelpTriggerProps>;

declare function HelpTrigger(props: HelpTriggerProps): React.ReactElement | null;

export default HelpTrigger;
