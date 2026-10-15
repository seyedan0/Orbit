import type { LocalStatus } from './task.js';

export interface TagEntity {
  id: string;
  userId: string;
  name: string;
  color?: string | undefined; // Hex color code e.g. '#6366f1'
  icon?: string | null | undefined;
  groupId?: string | null | undefined;
  order?: number | undefined;
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}

export interface TagGroupEntity {
  id: string;
  userId: string;
  name: string;
  color?: string | undefined;
  order?: number | undefined;
  version: number;
  localStatus: LocalStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}
