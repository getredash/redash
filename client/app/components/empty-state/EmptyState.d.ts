import React from "react";

type DefaultStepKey = "dataSources" | "queries" | "alerts" | "dashboards" | "users";
export type StepKey<K> = DefaultStepKey | K;

export interface StepItem<K> {
  key: StepKey<K>;
  node: React.ReactNode;
}

export interface EmptyStateProps<K = unknown> {
  header?: string;
  icon?: string;
  description: string;
  illustration: string;
  illustrationPath?: string;
  helpLink: string;

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
  urlText?: string;
  text: string;
  onClick?: () => void;
}

export declare const Step: React.FunctionComponent<StepProps>;
