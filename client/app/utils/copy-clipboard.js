export default class CopyClipboard {
  constructor(toastr) {
    this.toastr = toastr;
  }

  success() {
    this.toastr.success('Copied.');
  }

  fail(err) {
    this.toastr.error('Unable to copy. ' + err);
  }
}

