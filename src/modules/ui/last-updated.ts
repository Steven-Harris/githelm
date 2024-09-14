import { LAST_UPDATED } from "./elements";

export class LastUpdated {

  private timer: NodeJS.Timeout | undefined;
  private startTime: number | undefined;
  public startTimer() {
    if (this.timer) {
      this.resetTimer(this.timer);
    }
    this.startTime = Date.now();

    this.timer = setInterval(() => {
      if (this.startTime) {
        const elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        LAST_UPDATED.innerHTML = `Last updated ${elapsedSeconds}s ago`;
      }
    }, 1000);
  }

  private resetTimer(timerInterval: NodeJS.Timeout) {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    this.startTime = undefined;
    LAST_UPDATED.innerHTML = 'Last updated 0s ago';
  }

}