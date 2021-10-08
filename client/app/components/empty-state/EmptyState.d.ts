import React from "react";

type DefaultStepKey = "dataSources" | "queries" | "alerts" | "dashboards" | "users";
export type StepKey<K> = DefaultStepKey | K;

export interface StepItem<K> {
  key: StepKey<K>;
  node: React.ReactNode;
}

export interface EmptyStateHelpMessageProps {
  helpTriggerType: string;
}

export declare const EmptyStateHelpMessage: React.FunctionComponent<EmptyStateHelpMessageProps>;

export interface EmptyStateProps<K = unknown> {
  header?: string;
  icon?: string;
  description: string;
  illustration: string;
  illustrationPath?: string;
  helpMessage?: React.ReactNode;
  closable?: boolean;
  onClose?: () => void;

  onboardingMode?: boolean;
  showAlertStep?: boolean;
  showDashboardStep?: boolean;
  showDataSourceStep?: boolean;
  showInviteStep?: boolean;

  getStepsItems?: (items: Array<StepItem<K>>) => Array<StepItem<K>>;
}

declare class EmptyState<R> extends React.Component<EmptyStateProps<R>> {}

export default EmptyState;

export interface StepProps {
  show: boolean;
  completed: boolean;
  url?: string;
  urlTarget?: string;
  urlText?: React.ReactNode;
  text?: React.ReactNode;
  onClick?: () => void;
}

export declare const Step: React.FunctionComponent<StepProps>;
