export function mapTree(node, callback) {
  const newNode = callback({ ...node });
  if (newNode.children) {
    newNode.children = newNode.children.map((child) => mapTree(child, callback));
  }
  return newNode;
}

export function filterTree(node, idToDelete) {
  if (node.id === idToDelete) return null;
  const newNode = { ...node };
  if (newNode.children) {
    newNode.children = newNode.children.map((child) => filterTree(child, idToDelete)).filter(Boolean);
  }
  return newNode;
}
