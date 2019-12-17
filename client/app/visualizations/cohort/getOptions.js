const DEFAULT_OPTIONS = {
  timeInterval: "daily",
  mode: "diagonal",
  dateColumn: "date",
  stageColumn: "day_number",
  totalColumn: "total",
  valueColumn: "value",
};

export default function getOptions(options) {
  return { ...DEFAULT_OPTIONS, ...options };
}
