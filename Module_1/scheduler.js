/**
 * scheduler.js — Multi-Level Queue (MLQ) Scheduler
 *
 * Priority mapping:
 *   Level 0 — HIGH   → Emergency / VIP / reserved
 *   Level 1 — MEDIUM → Pre-booked / registered vehicles
 *   Level 2 — LOW    → Walk-in / unregistered vehicles
 */

const NUM_LEVELS = 3;

class Scheduler {
  constructor() {
    this.levels         = Array.from({ length: NUM_LEVELS }, (_, i) => new Queue(i));
    this.currentProcess = null;
    this.log            = [];
    this._pidCounter    = 1;
  }

  /**
   * Route a PCB into the correct priority queue.
   * @param {PCB} proc
   */
  enqueue(proc) {
    this.levels[proc.priority].enqueue(proc);
    this._log('enqueue', proc, `Added to ${proc.priorityLabel} queue`);
  }

  /**
   * Remove the front PCB from the highest-priority non-empty queue.
   * @returns {PCB|null}
   */
  dequeue() {
    for (let i = 0; i < NUM_LEVELS; i++) {
      if (!this.levels[i].isEmpty) {
        const proc = this.levels[i].dequeue();
        this._log('dequeue', proc, `Removed from ${['HIGH','MEDIUM','LOW'][i]} queue`);
        return proc;
      }
    }
    return null;
  }

  /**
   * Select the next process to run (MLQ policy).
   * Transitions it to RUNNING. Re-enqueues the previous
   * process if it still has remaining time.
   * @returns {PCB|null}
   */
  getNextProcess() {
    if (this.currentProcess && this.currentProcess.state === 'RUNNING') {
      if (this.currentProcess.remainingTime > 0) {
        this.currentProcess.state = 'READY';
        this.enqueue(this.currentProcess);
      }
    }
    const next = this.dequeue();
    if (!next) {
      this.currentProcess = null;
      this._log('idle', null, 'All queues empty — scheduler idle');
      return null;
    }
    next.state = 'RUNNING';
    this.currentProcess = next;
    this._log('schedule', next, 'Process selected for execution');
    return next;
  }

  /**
   * Create a new PCB and enqueue it in one step.
   * @returns {PCB}
   */
  createAndEnqueue(vehicleId, priority, burstTime) {
    const proc = new PCB(this._pidCounter++, vehicleId, priority, burstTime);
    this.enqueue(proc);
    return proc;
  }

  /**
   * Advance the running process by one tick.
   * @returns {boolean} true if the process just completed
   */
  tick() {
    if (!this.currentProcess || this.currentProcess.state !== 'RUNNING') return false;
    this.currentProcess.tick();
    if (this.currentProcess.state === 'TERMINATED') {
      this._log('complete', this.currentProcess, 'Process finished');
      return true;
    }
    return false;
  }

  get totalWaiting() {
    return this.levels.reduce((sum, q) => sum + q.size, 0);
  }

  allWaiting() {
    return this.levels.flatMap(q => q.snapshot());
  }

  _log(event, proc, message) {
    this.log.unshift({
      ts:      new Date().toLocaleTimeString(),
      event,
      pid:     proc ? proc.pid      : null,
      vehicle: proc ? proc.vehicleId : null,
      message,
    });
    if (this.log.length > 50) this.log.pop();
  }
}
