import type { SubTaskItem } from '@orbit/shared-types';

/**
 * Recursively finds a subtask node by its id anywhere in the tree.
 */
export function findSubtaskNode(tree: SubTaskItem[], id: string): SubTaskItem | null {
  for (const node of tree) {
    if (node.id === id) {
      return node;
    }
    if (node.children && node.children.length > 0) {
      const found = findSubtaskNode(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Inserts a new child into the tree.
 * If parentId is null or undefined, appends to the root level.
 * Otherwise recursively finds parentId and appends to its children array.
 */
export function insertSubtaskChild(
  tree: SubTaskItem[],
  parentId: string | null | undefined,
  newChild: SubTaskItem
): SubTaskItem[] {
  if (!parentId) {
    return [
      ...tree,
      {
        ...newChild,
        parentId: null,
        order: tree.length,
        children: newChild.children ?? []
      }
    ];
  }

  return tree.map((node) => {
    if (node.id === parentId) {
      const existingChildren = node.children ?? [];
      const updatedChild: SubTaskItem = {
        ...newChild,
        parentId: node.id,
        order: existingChildren.length,
        children: newChild.children ?? []
      };
      const newChildren = [...existingChildren, updatedChild];
      // If parent was marked completed but now has an uncompleted child, uncomplete the parent
      const allCompleted = newChildren.every((c) => c.isCompleted);
      return {
        ...node,
        children: newChildren,
        isCompleted: allCompleted,
        completedAt: allCompleted ? node.completedAt : null
      };
    }

    if (node.children && node.children.length > 0) {
      const updatedChildren = insertSubtaskChild(node.children, parentId, newChild);
      const allCompleted = updatedChildren.every((c) => c.isCompleted);
      return {
        ...node,
        children: updatedChildren,
        isCompleted: allCompleted,
        completedAt: allCompleted ? node.completedAt : null
      };
    }

    return node;
  });
}

/**
 * Cascades completion state recursively downward to all descendants.
 */
function cascadeCompletionDown(
  node: SubTaskItem,
  targetCompleted: boolean,
  nowIso: string
): SubTaskItem {
  const children = (node.children ?? []).map((child) =>
    cascadeCompletionDown(child, targetCompleted, nowIso)
  );

  return {
    ...node,
    isCompleted: targetCompleted,
    completedAt: targetCompleted ? nowIso : null,
    children
  };
}

/**
 * Toggles a subtask's completion state:
 * - Cascades completion downward to all descendants.
 * - Bubbles completion state upward: if all siblings become completed, parent completes;
 *   if any sibling is incomplete, parent becomes incomplete.
 */
export function toggleSubtaskCompletion(
  tree: SubTaskItem[],
  id: string,
  nowIso: string = new Date().toISOString()
): { updatedTree: SubTaskItem[]; isNowCompleted: boolean } {
  let isNowCompleted = false;

  function processNode(node: SubTaskItem): SubTaskItem {
    if (node.id === id) {
      const nextCompleted = !node.isCompleted;
      isNowCompleted = nextCompleted;
      return cascadeCompletionDown(node, nextCompleted, nowIso);
    }

    if (node.children && node.children.length > 0) {
      const updatedChildren = node.children.map(processNode);
      const allChildrenCompleted =
        updatedChildren.length > 0 && updatedChildren.every((c) => c.isCompleted);

      return {
        ...node,
        children: updatedChildren,
        isCompleted: allChildrenCompleted,
        completedAt: allChildrenCompleted ? (node.completedAt ?? nowIso) : null
      };
    }

    return node;
  }

  const updatedTree = tree.map(processNode);
  return { updatedTree, isNowCompleted };
}

/**
 * Deletes a subtask node by id from the tree.
 * Also re-evaluates parent completion state if child removal affects it.
 */
export function deleteSubtaskNode(tree: SubTaskItem[], id: string): SubTaskItem[] {
  return tree
    .filter((node) => node.id !== id)
    .map((node) => {
      if (node.children && node.children.length > 0) {
        const updatedChildren = deleteSubtaskNode(node.children, id);
        const allCompleted =
          updatedChildren.length > 0
            ? updatedChildren.every((c) => c.isCompleted)
            : node.isCompleted;

        return {
          ...node,
          children: updatedChildren,
          isCompleted: allCompleted,
          completedAt: allCompleted ? node.completedAt : null
        };
      }
      return node;
    });
}

/**
 * Updates the title of a specific subtask node.
 */
export function updateSubtaskTitle(tree: SubTaskItem[], id: string, title: string): SubTaskItem[] {
  return tree.map((node) => {
    if (node.id === id) {
      return {
        ...node,
        title: title.trim()
      };
    }
    if (node.children && node.children.length > 0) {
      return {
        ...node,
        children: updateSubtaskTitle(node.children, id, title)
      };
    }
    return node;
  });
}

/**
 * Calculates total, completed, and percentage progress for all nodes in the tree.
 */
export function calculateSubtaskProgress(tree: SubTaskItem[]): {
  total: number;
  completed: number;
  percentage: number;
} {
  let total = 0;
  let completed = 0;

  function traverse(nodes: SubTaskItem[]) {
    for (const node of nodes) {
      total++;
      if (node.isCompleted) {
        completed++;
      }
      if (node.children && node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(tree);

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  return { total, completed, percentage };
}

/**
 * Promotes a subtask to an independent root task by removing it from the tree
 * and returning the extracted subtask (along with any nested children it owns).
 */
export function promoteSubtaskToTask(
  tree: SubTaskItem[],
  subtaskId: string
): { updatedTree: SubTaskItem[]; extractedSubtask: SubTaskItem | null } {
  let extractedSubtask: SubTaskItem | null = null;

  function traverseAndRemove(nodes: SubTaskItem[]): SubTaskItem[] {
    const result: SubTaskItem[] = [];

    for (const node of nodes) {
      if (node.id === subtaskId) {
        extractedSubtask = {
          ...node,
          parentId: null
        };
        // Skip adding to result, thereby removing from tree
        continue;
      }

      if (node.children && node.children.length > 0) {
        const updatedChildren = traverseAndRemove(node.children);
        const allCompleted =
          updatedChildren.length > 0
            ? updatedChildren.every((c) => c.isCompleted)
            : node.isCompleted;

        result.push({
          ...node,
          children: updatedChildren,
          isCompleted: allCompleted,
          completedAt: allCompleted ? node.completedAt : null
        });
      } else {
        result.push(node);
      }
    }

    return result;
  }

  const updatedTree = traverseAndRemove(tree);
  return { updatedTree, extractedSubtask };
}
