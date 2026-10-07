import { InternalNode } from "./InternalNode";
import { LeafNode } from "./LeafNode";
import { NodeId } from "./types";


export class BplusTree {
    private nodes: Map<NodeId, InternalNode | LeafNode>
    private root: NodeId;
    private size: number;

    constructor(size: number) {
        this.nodes = new Map();
        this.size = size;
        this.root = this.createEmptyLeafNode();
    }

    createEmptyLeafNode(): NodeId {
        const id = this.nodes.size;
        this.nodes.set(id, new LeafNode([], [], null));
        return id;
    }

    insert(key: number, value: string): void {
        const { leafId, path } = this.findLeaf(key);
        const leaf = this.nodes.get(leafId) as LeafNode;

        let i = 0;
        while (i < leaf.keys.length && key > leaf.keys[i]!) {
            i++;
        }
        if (leaf.keys[i] == key) {
            leaf.values[i] = value;
        }
        if (leaf.keys[i] != key) {
            leaf.keys.splice(i, 0, key);
            leaf.values.splice(i, 0, value);
        }

        if (leaf.keys.length > this.size) {
            this.splitLeaf(leaf, leafId, path);
        }

    }

    findLeaf(key: number): { leafId: NodeId, path: NodeId[] } {
        let currentId = this.root;
        const path: NodeId[] = [];
        while (true) {
            const current = this.nodes.get(currentId)!;
            if (current instanceof LeafNode) {
                return { leafId: currentId, path };
            }
            path.push(currentId);
            currentId = current.findChild(key);
        }
    }

    splitLeaf(leaf: LeafNode, leafId: number, path: NodeId[]): void {
        const mid = Math.floor(leaf.keys.length / 2);

        const rightKeys = leaf.keys.slice(mid);
        const rightValues = leaf.values.slice(mid);

        leaf.keys = leaf.keys.slice(0, mid);
        leaf.values = leaf.values.slice(0, mid);

        const newLeafId = this.nodes.size;
        const newLeaf = new LeafNode(rightKeys, rightValues, null);

        leaf.next = newLeafId;
        this.nodes.set(newLeafId, newLeaf);

        if (path.length == 0) {
            createInternalNode(rightKeys[0]!, leafId, newLeafId);
        }


    }

}
