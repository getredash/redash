import template from './footer.html';

function controller(clientConfig, currentUser) {
  this.version = clientConfig.version;
  this.newVersionAvailable = clientConfig.newVersionAvailable && currentUser.isAdmin;
}

export default function (ngModule) {
  ngModule.component('footer', {
    template,
    controller,
  });
}
