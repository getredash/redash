import recordEvent from "@/services/recordEvent";

function Events() {
  this.record = recordEvent;
}

export default function init(ngModule) {
  ngModule.service("Events", Events);
}

init.init = true;
