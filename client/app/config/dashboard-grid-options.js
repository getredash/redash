const dashboardGridOptions = {
  columns: 6,
  pushing: true,
  floating: true,
  swapping: true,
  width: 'auto',
  colWidth: 'auto',
  rowHeight: 50,
  margins: [15, 15],
  outerMargin: false,
  sparse: false,
  isMobile: false,
  mobileBreakPoint: 800,
  mobileModeEnabled: true,
  minColumns: 1,
  minRows: 1,
  maxRows: 100,
  defaultSizeX: 3,
  defaultSizeY: 3,
  minSizeX: 1,
  maxSizeX: null,
  minSizeY: 4,
  maxSizeY: null,
  resizable: {
    enabled: false,
    handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
  },
  draggable: {
    enabled: false,
  },
};

export default function init(ngModule) {
  ngModule.constant('dashboardGridOptions', dashboardGridOptions);
}
