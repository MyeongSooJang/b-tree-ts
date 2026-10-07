import { NodeId } from "./types";

export class InternalNode {
  keys: number[];
  children: NodeId[];

  constructor(keys: number[], nodeIds: NodeId[]) {
    this.keys = keys;
    this.children = nodeIds;
  }

  insertKey(key: number, rightChildId: NodeId): void {
    let i = 0;
    while (i < this.keys.length && key > this.keys[i]!) {
      i++;
    }
    this.keys.splice(i, 0, key);
    this.children.splice(i + 1, 0, rightChildId);
  }

  findChild(key: number): number {
    for (let i = 0; i < this.keys.length; i++) {
      if (key < this.keys[i]!) {
        return this.children[i]!;
      }
    }
    return this.children[this.keys.length]!;
  }
}
