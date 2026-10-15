import { describe, expect, it } from 'vitest';
import type { SubTaskItem } from '@orbit/shared-types';
import {
  calculateSubtaskProgress,
  deleteSubtaskNode,
  findSubtaskNode,
  insertSubtaskChild,
  promoteSubtaskToTask,
  toggleSubtaskCompletion,
  updateSubtaskTitle
} from './subtask-tree';

describe('subtask-tree engine', () => {
  const createDeepTree = (): SubTaskItem[] => [
    {
      id: 'root-1',
      title: 'Root 1 (Level 1)',
      isCompleted: false,
      order: 0,
      parentId: null,
      children: [
        {
          id: 'child-1-1',
          title: 'Child 1.1 (Level 2)',
          isCompleted: false,
          order: 0,
          parentId: 'root-1',
          children: [
            {
              id: 'child-1-1-1',
              title: 'Child 1.1.1 (Level 3)',
              isCompleted: false,
              order: 0,
              parentId: 'child-1-1',
              children: [
                {
                  id: 'child-1-1-1-1',
                  title: 'Child 1.1.1.1 (Level 4)',
                  isCompleted: false,
                  order: 0,
                  parentId: 'child-1-1-1'
                }
              ]
            }
          ]
        },
        {
          id: 'child-1-2',
          title: 'Child 1.2 (Level 2)',
          isCompleted: false,
          order: 1,
          parentId: 'root-1'
        }
      ]
    },
    {
      id: 'root-2',
      title: 'Root 2 (Level 1)',
      isCompleted: false,
      order: 1,
      parentId: null
    }
  ];

  it('finds node deeply nested up to depth 4', () => {
    const tree = createDeepTree();
    const deepNode = findSubtaskNode(tree, 'child-1-1-1-1');
    expect(deepNode).not.toBeNull();
    expect(deepNode?.title).toBe('Child 1.1.1.1 (Level 4)');

    const nonExistent = findSubtaskNode(tree, 'does-not-exist');
    expect(nonExistent).toBeNull();
  });

  it('inserts children at root and at deep nested nodes', () => {
    let tree = createDeepTree();

    // Insert at root
    const newRoot: SubTaskItem = {
      id: 'root-3',
      title: 'Root 3',
      isCompleted: false,
      order: 2
    };
    tree = insertSubtaskChild(tree, null, newRoot);
    expect(tree).toHaveLength(3);
    expect(tree[2]?.id).toBe('root-3');

    // Insert at Level 4 node to create Level 5
    const level5Child: SubTaskItem = {
      id: 'child-level-5',
      title: 'Child (Level 5)',
      isCompleted: false,
      order: 0
    };
    tree = insertSubtaskChild(tree, 'child-1-1-1-1', level5Child);
    const parent = findSubtaskNode(tree, 'child-1-1-1-1');
    expect(parent?.children).toHaveLength(1);
    expect(parent?.children?.[0]?.id).toBe('child-level-5');
    expect(parent?.children?.[0]?.parentId).toBe('child-1-1-1-1');
  });

  it('cascades completion downward when parent is checked', () => {
    const tree = createDeepTree();
    const { updatedTree, isNowCompleted } = toggleSubtaskCompletion(tree, 'child-1-1');

    expect(isNowCompleted).toBe(true);

    const child11 = findSubtaskNode(updatedTree, 'child-1-1');
    expect(child11?.isCompleted).toBe(true);

    const child111 = findSubtaskNode(updatedTree, 'child-1-1-1');
    expect(child111?.isCompleted).toBe(true);

    const child1111 = findSubtaskNode(updatedTree, 'child-1-1-1-1');
    expect(child1111?.isCompleted).toBe(true);

    // root-1 has child-1-2 which is still false, so root-1 is false
    const root1 = findSubtaskNode(updatedTree, 'root-1');
    expect(root1?.isCompleted).toBe(false);
  });

  it('bubbles completion upward when all children become completed', () => {
    let tree = createDeepTree();

    // Complete child-1-2
    tree = toggleSubtaskCompletion(tree, 'child-1-2').updatedTree;
    // Complete child-1-1 (which cascades to child-1-1-1 and child-1-1-1-1)
    tree = toggleSubtaskCompletion(tree, 'child-1-1').updatedTree;

    // Now all children of root-1 are completed, so root-1 should bubble to completed!
    const root1 = findSubtaskNode(tree, 'root-1');
    expect(root1?.isCompleted).toBe(true);
  });

  it('uncompletes parent when any child is toggled back to incomplete', () => {
    let tree = createDeepTree();

    // Complete both branches
    tree = toggleSubtaskCompletion(tree, 'child-1-2').updatedTree;
    tree = toggleSubtaskCompletion(tree, 'child-1-1').updatedTree;
    expect(findSubtaskNode(tree, 'root-1')?.isCompleted).toBe(true);

    // Now uncheck deepest child (child-1-1-1-1)
    tree = toggleSubtaskCompletion(tree, 'child-1-1-1-1').updatedTree;

    expect(findSubtaskNode(tree, 'child-1-1-1-1')?.isCompleted).toBe(false);
    expect(findSubtaskNode(tree, 'child-1-1-1')?.isCompleted).toBe(false);
    expect(findSubtaskNode(tree, 'child-1-1')?.isCompleted).toBe(false);
    expect(findSubtaskNode(tree, 'root-1')?.isCompleted).toBe(false);
    // But child-1-2 remains completed!
    expect(findSubtaskNode(tree, 'child-1-2')?.isCompleted).toBe(true);
  });

  it('deletes subtask and recalculates parent completion', () => {
    let tree = createDeepTree();
    // Complete child-1-2
    tree = toggleSubtaskCompletion(tree, 'child-1-2').updatedTree;

    // Delete uncompleted child-1-1
    tree = deleteSubtaskNode(tree, 'child-1-1');

    const root1 = findSubtaskNode(tree, 'root-1');
    expect(root1?.children).toHaveLength(1);
    expect(root1?.children?.[0]?.id).toBe('child-1-2');
    // Because the only remaining child (child-1-2) is completed, root-1 becomes completed!
    expect(root1?.isCompleted).toBe(true);
  });

  it('updates subtask title cleanly', () => {
    const tree = createDeepTree();
    const updated = updateSubtaskTitle(tree, 'child-1-1-1', '  عنوان جدید زیرتسک  ');
    const node = findSubtaskNode(updated, 'child-1-1-1');
    expect(node?.title).toBe('عنوان جدید زیرتسک');
  });

  it('calculates total, completed, and percentage progress accurately', () => {
    let tree = createDeepTree();
    // Initially: root-1, child-1-1, child-1-1-1, child-1-1-1-1, child-1-2, root-2 = 6 nodes
    let progress = calculateSubtaskProgress(tree);
    expect(progress.total).toBe(6);
    expect(progress.completed).toBe(0);
    expect(progress.percentage).toBe(0);

    // Complete child-1-1 (completes child-1-1, child-1-1-1, child-1-1-1-1 = 3 completed)
    tree = toggleSubtaskCompletion(tree, 'child-1-1').updatedTree;
    progress = calculateSubtaskProgress(tree);
    expect(progress.completed).toBe(3);
    expect(progress.percentage).toBe(50); // 3 out of 6 = 50%
  });

  it('promotes subtask to independent task, preserving nested children and removing from parent', () => {
    const tree = createDeepTree();

    const { updatedTree, extractedSubtask } = promoteSubtaskToTask(tree, 'child-1-1');

    expect(extractedSubtask).not.toBeNull();
    expect(extractedSubtask?.id).toBe('child-1-1');
    expect(extractedSubtask?.parentId).toBeNull();
    expect(extractedSubtask?.children).toHaveLength(1);
    expect(extractedSubtask?.children?.[0]?.id).toBe('child-1-1-1');

    // Node is removed from root-1's children
    const root1 = findSubtaskNode(updatedTree, 'root-1');
    expect(root1?.children).toHaveLength(1);
    expect(root1?.children?.[0]?.id).toBe('child-1-2');
  });
});
