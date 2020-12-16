import React from "react";
import Tooltip from "antd/lib/tooltip";
import { localizeTime, durationHumanize } from "@/lib/utils";
import { RefreshScheduleType, RefreshScheduleDefault } from "../proptypes";

import "./ScheduleDialog.css";

type OwnProps = {
    schedule?: RefreshScheduleType;
    isNew: boolean;
    isLink?: boolean;
    onClick?: (...args: any[]) => any;
};

type Props = OwnProps & typeof SchedulePhrase.defaultProps;

export default class SchedulePhrase extends React.Component<Props> {

  static defaultProps = {
    schedule: RefreshScheduleDefault,
    isLink: false,
    onClick: () => {},
  };

  get content() {
    const { interval: seconds } = this.props.schedule || SchedulePhrase.defaultProps.schedule;
    if (!seconds) {
      return ["Never"];
    }
    const humanized = durationHumanize(seconds, {
      omitSingleValueNumber: true,
    });
    const short = `Every ${humanized}`;
    let full = `Refreshes every ${humanized}`;

    const { time, day_of_week: dayOfWeek } = this.props.schedule;
    if (time) {
      full += ` at ${localizeTime(time)}`;
    }
    if (dayOfWeek) {
      full += ` on ${dayOfWeek}`;
    }

    return [short, full];
  }

  render() {
    if (this.props.isNew) {
      return "Never";
    }

    const [short, full] = this.content;
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'string' is not assignable to type 'ReactElem... Remove this comment to see the full error message
    const content = full ? <Tooltip title={full}>{short}</Tooltip> : short;

    return this.props.isLink ? (
      <a className="schedule-phrase" onClick={this.props.onClick} data-test="EditSchedule">
        {content}
      </a>
    ) : (
      content
    );
  }
}
