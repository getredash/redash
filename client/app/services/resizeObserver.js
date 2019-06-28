const items = new Map();

function checkItems() {
  items.forEach((item, node) => {
    const bounds = node.getBoundingClientRect();
    // convert to int (because these numbers needed for comparisons), but preserve 1 decimal point
    const width = Math.round(bounds.width * 10);
    const height = Math.round(bounds.height * 10);

    if (
      (item.width !== width) ||
      (item.height !== height)
    ) {
      item.width = width;
      item.height = height;
      item.callback(node);
    }
  });

  setTimeout(checkItems, 100);
}

checkItems(); // ensure it was called only once!

export default function observe(node, callback) {
  if (!items.has(node)) {
    items.set(node, { callback });
    return () => items.delete(node);
  }
  return () => {};
}
