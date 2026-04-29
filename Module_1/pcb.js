/**
 * pcb.js — Process Control Block
 * Represents a single parking request process.
 */

class PCB {
  /**
   * @param {number} pid       - Unique process ID
   * @param {string} vehicleId - License plate / vehicle identifier
   * @param {number} priority  - MLQ level: 0 = HIGH, 1 = MEDIUM, 2 = LOW
   * @param {number} burstTime - Estimated processing time (ticks)
   */
  constructor(pid, vehicleId, priority, burstTime) {
    this.pid           = pid;
    this.vehicleId     = vehicleId;
    this.priority      = priority;
    this.burstTime     = burstTime;
    this.remainingTime = burstTime;
    this.arrivalTime   = Date.now();
    this.state         = 'READY'; // READY | RUNNING | TERMINATED
  }

  get priorityLabel() {
    return ['HIGH', 'MEDIUM', 'LOW'][this.priority] ?? 'UNKNOWN';
  }

  get priorityClass() {
    return ['b-hi', 'b-me', 'b-lo'][this.priority] ?? '';
  }

  /** Advance one execution tick */
  tick() {
    if (this.state === 'RUNNING' && this.remainingTime > 0) {
      this.remainingTime--;
      if (this.remainingTime === 0) this.state = 'TERMINATED';
    }
  }
}
