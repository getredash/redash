import registerList from './list';
import registerShow from './show';
import registerDataSources from './data-sources';
import registerEditGroupDialog from './edit-group-dialog';
import registerGroupName from './group-name';

export default function (ngModule) {
  registerEditGroupDialog(ngModule);
  registerGroupName(ngModule);

  return Object.assign({}, registerList(ngModule),
                           registerShow(ngModule),
                           registerDataSources(ngModule));
}
