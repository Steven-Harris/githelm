import { getLastUpdated } from "@services";
import { LAST_UPDATED } from "./elements";

export class LastUpdated {

  private timer: NodeJS.Timeout | undefined;
  public startTimer() {
    if (this.timer) {
      this.resetTimer(this.timer);
    }

    this.timer = setInterval(() => {
      console.log('updated')
      const elapsedSeconds = Math.floor((Date.now() - getLastUpdated()) / 1000);
      LAST_UPDATED.innerHTML = `Last updated ${elapsedSeconds}s ago`;
    }, 1000);
  }

  private resetTimer(timerInterval: NodeJS.Timeout) {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    LAST_UPDATED.innerHTML = 'Last updated 0s ago';
  }
}