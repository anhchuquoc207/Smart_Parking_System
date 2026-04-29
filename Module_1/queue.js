/**
 * queue.js — FIFO Queue
 * Array-based queue holding PCB instances.
 */

class Queue {
  /**
   * @param {number} priorityLevel - Which MLQ level this queue serves (0/1/2)
   */
  constructor(priorityLevel) {
    this.priorityLevel = priorityLevel;
    this._data = [];
  }

  get size()    { return this._data.length; }
  get isEmpty() { return this._data.length === 0; }

  /** Insert a PCB at the tail — O(1) */
  enqueue(proc) {
    proc.state = 'READY';
    this._data.push(proc);
  }

  /** Remove and return the PCB at the head — O(n) */
  dequeue() {
    return this._data.shift() ?? null;
  }

  /** Inspect front without removing */
  peek() {
    return this._data[0] ?? null;
  }

  /** Read-only snapshot of all waiting PCBs */
  snapshot() {
    return [...this._data];
  }
}
