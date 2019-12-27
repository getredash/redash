import recordEvent from "@/services/recordEvent";

// ANGULAR_REMOVE_ME delete this file - it replaced with recordEvent

function Events() {
  this.record = recordEvent;
}

export default function init(ngModule) {
  ngModule.service("Events", Events);
}

init.init = true;
