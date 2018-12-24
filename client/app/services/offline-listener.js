function OfflineListener(toastr) {
  function addOnlineListener(toast) {
    function onlineStateHandler() {
      toastr.remove(toast.toastId);
      window.removeEventListener('online', onlineStateHandler);
    }
    window.addEventListener('online', onlineStateHandler);
  }

  window.addEventListener('offline', () => {
    const toast = toastr.warning('<div>Please check your Internet connection.</div>', '', {
      allowHtml: true,
      autoDismiss: false,
      timeOut: false,
      tapToDismiss: true,
    });
    addOnlineListener(toast);
  });
}

export default function init(ngModule) {
  ngModule.service('OfflineListener', OfflineListener);
}

init.init = true;
