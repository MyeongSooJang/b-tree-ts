import { NodeId } from "./types";

export class LeafNode {
  keys: number[];
  values: string[];
  next: NodeId | null;

  constructor(keys: number[], values: string[], next: NodeId | null) {
    this.keys = keys;
    this.values = values;
    this.next = next;
  }
}
