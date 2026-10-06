import { NodeId } from "./types";

export class InternalNode {
  keys: number[];
  children: NodeId[];

  constructor(keys: number[], nodeIds: NodeId[]) {
    this.keys = keys;
    this.children = nodeIds;
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
