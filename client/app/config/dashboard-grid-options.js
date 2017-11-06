const dashboardGridOptions = {
  columns: 6,
  pushing: true,
  floating: true,
  swapping: true,
  width: 'auto',
  colWidth: 'auto',
  rowHeight: 100,
  margins: [0, 0],
  outerMargin: false,
  sparse: false,
  isMobile: false,
  mobileBreakPoint: 1200,
  mobileModeEnabled: true,
  minColumns: 1,
  minRows: 1,
  maxRows: 100,
  defaultSizeX: 3,
  defaultSizeY: 2,
  minSizeX: 1,
  maxSizeX: null,
  minSizeY: 1,
  maxSizeY: null,
  resizable: {
    enabled: true,
    handles: ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'],
  },
  draggable: {
    enabled: true, // whether dragging items is supported
  },
};

export default function init(ngModule) {
  ngModule.constant('dashboardGridOptions', dashboardGridOptions);
}
