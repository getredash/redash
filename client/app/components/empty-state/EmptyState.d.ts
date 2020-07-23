import React from "react";

export interface EmptyStateProps {
  header?: string;
  icon?: string;
  description: string;
  illustration: string;
  helpLink: string;

  onboardingMode?: boolean;
  showAlertStep?: boolean;
  showDashboardStep?: boolean;
  showInviteStep?: boolean;
}

declare const EmptyState: React.FunctionComponent<EmptyStateProps>;

export default EmptyState;
