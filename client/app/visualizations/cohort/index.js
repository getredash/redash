import registry from '@/visualizations/registry';
import CohortRenderer from './CohortRenderer';
import CohortEditor from './CohortEditor';

registry.COHORT = Object.freeze({
  name: 'Cohort',
  renderer: CohortRenderer,
  editor: CohortEditor,
  defaultOptions: CohortRenderer.DEFAULT_OPTIONS,
});
