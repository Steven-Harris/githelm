import { Store } from './base/store';
import { getLastUpdated } from '../integrations/storage';

/**
 * Controller for tracking time since last data update
 */
export class TimestampController extends Store {
  // Events
  static readonly TIME_ELAPSED = 'time-elapsed';
  static readonly TIMER_RESET = 'timer-reset';
  
  // Private state
  private _secondsElapsed: number = 0;
  private _timerInterval: number | null = null;
  
  constructor() {
    super();
    this.startTimer();
  }
  
  /**
   * Get elapsed time in seconds since last update
   */
  get secondsElapsed(): number {
    return this._secondsElapsed;
  }
  
  /**
   * Start tracking elapsed time
   */
  startTimer(): void {
    // Clear any existing timers
    this.stopTimer();
    
    // Get initial elapsed time
    this._secondsElapsed = this.calculateTimeElapsed();
    this.emitChange(TimestampController.TIME_ELAPSED, { secondsElapsed: this._secondsElapsed });
    
    // Set up interval to update time every second
    this._timerInterval = window.setInterval(() => {
      this._secondsElapsed = this.calculateTimeElapsed();
      this.emitChange(TimestampController.TIME_ELAPSED, { secondsElapsed: this._secondsElapsed });
    }, 1000) as unknown as number;
  }
  
  /**
   * Stop tracking elapsed time
   */
  stopTimer(): void {
    if (this._timerInterval !== null) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
  }
  
  /**
   * Reset the timer to zero
   */
  resetTimer(): void {
    this._secondsElapsed = 0;
    this.emitChange(TimestampController.TIMER_RESET, { secondsElapsed: 0 });
  }
  
  /**
   * Calculate time elapsed since last update
   */
  private calculateTimeElapsed(): number {
    const lastUpdated = getLastUpdated();
    if (!lastUpdated) {
      return 0;
    }
    return Math.floor((Date.now() - lastUpdated) / 1000);
  }
  
  /**
   * Clean up resources when controller is no longer needed
   */
  dispose(): void {
    this.stopTimer();
  }
}

// Create a singleton instance
export const timestampController = new TimestampController();