import React from 'react';
import DateRangeInput from "@/components/DateRangeInput";

const DateRangePicker = ({ selectedDate, onChange }) => {
  return <DateRangeInput selected={selectedDate} onChange={onChange} />;
};

export default DateRangePicker;