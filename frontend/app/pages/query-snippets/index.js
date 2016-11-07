import registerList from './list';
import registerEdit from './edit';

export default function (ngModule) {
  const routes = Object.assign({}, registerList(ngModule),
                                   registerEdit(ngModule));
  return routes;
}
