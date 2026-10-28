// The old site generated heading anchors in the browser as
//   text.replace(/[. ,:-]+/g, '-').replace(/-$/, '')   e.g. #Value-Source-Options
// and the Redash app deep-links to them (client/app/components/HelpTrigger.jsx).
// Keep those URLs working by adding the legacy id as an empty anchor inside each
// heading, next to the new lowercase id.
const HEADINGS = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

const text = (node) =>
  node.type === 'text' ? node.value : (node.children ?? []).map(text).join('')

export default function rehypeLegacyAnchors() {
  return (tree) => {
    const seen = new Set()
    const visit = (node) => {
      if (node.type === 'element' && HEADINGS.has(node.tagName)) {
        const legacy = text(node).trim().replace(/[. ,:-]+/g, '-').replace(/-$/, '')
        if (legacy && legacy !== node.properties?.id && !seen.has(legacy)) {
          seen.add(legacy)
          node.children.unshift({
            type: 'element',
            tagName: 'span',
            properties: { id: legacy, className: ['legacy-anchor'] },
            children: [],
          })
        }
        return
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}
