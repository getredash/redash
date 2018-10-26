import registry from '@/visualizations/registry';
import WordCloudRenderer from './WordCloudRenderer';
import WordCloudEditor from './WordCloudEditor';

registry.WORD_CLOUD = Object.freeze({
  name: 'Word Cloud',
  renderer: WordCloudRenderer,
  editor: WordCloudEditor,
  defaultOptions: WordCloudRenderer.DEFAULT_OPTIONS,
});
