const dashboardGridOptions = {
  columns: 6, // grid columns count
  rowHeight: 50, // grid row height (incl. bottom padding)
  margins: 15, // widget margins
  mobileBreakPoint: 800,
  // defaults for widgets
  defaultSizeX: 3,
  defaultSizeY: 3,
  minSizeX: 1,
  maxSizeX: 6,
  minSizeY: 1,
  maxSizeY: 1000,
};

export default function init(ngModule) {
  ngModule.constant('dashboardGridOptions', dashboardGridOptions);
}
