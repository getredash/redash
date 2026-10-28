// Docs link to each other with absolute /help/... URLs. In an archived version
// (DOCS_BASE=help/v/26.9) rewrite them so readers stay within that version.
export default function rehypeDocsBase({ base }) {
  return (tree) => {
    if (base === 'help') return
    const visit = (node) => {
      const href = node.type === 'element' && node.tagName === 'a' && node.properties?.href
      if (typeof href === 'string' && (href === '/help/' || href.startsWith('/help/') || href.startsWith('/help#'))) {
        node.properties.href = `/${base}` + href.slice('/help'.length)
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}
