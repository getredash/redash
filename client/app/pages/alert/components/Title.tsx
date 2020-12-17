import React from "react";
import Input from "antd/lib/input";
import { getDefaultName } from "../Alert";
import { Alert as AlertType } from "@/components/proptypes";
import "./Title.less";
type OwnProps = {
    alert: AlertType;
    name?: string;
    children?: React.ReactNode;
    onChange?: (...args: any[]) => any;
    editMode?: boolean;
};
type Props = OwnProps & typeof Title.defaultProps;
export default function Title({ alert, editMode, name, onChange, children }: Props) {
    const defaultName = getDefaultName(alert);
    return (<div className="alert-header">
      <div className="alert-title">
        <h3>
          {/* @ts-expect-error ts-migrate(2349) FIXME: This expression is not callable. */}
          {editMode && (alert as any).query ? (<Input className="f-inherit" placeholder={defaultName} value={name} onChange={e => onChange(e.target.value)}/>) : (name || defaultName)}
        </h3>
      </div>
      <div className="alert-actions">{children}</div>
    </div>);
}
Title.defaultProps = {
    name: null,
    children: null,
    onChange: null,
    editMode: false,
};
