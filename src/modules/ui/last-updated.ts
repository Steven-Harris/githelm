import { getLastUpdated } from "@services";
import { LAST_UPDATED, REFRESH_BUTTON } from "./elements";

export class LastUpdated {

  private timer: any | undefined;
  private lastUpdated: number = 0;
  public startTimer() {
    if (this.timer) {
      this.resetTimer(this.timer);
    }
    this.updateTimer()
    REFRESH_BUTTON.classList.remove('hidden');

    this.timer = setInterval(() => this.updateTimer(), 1000);
  }

  private elapsedSeconds(): number {
    if (this.lastUpdated === 0) {
      const lastUpdated = getLastUpdated();
      if (!lastUpdated) {
        return 0;
      }
      this.lastUpdated = Number(lastUpdated)
    }

    return Math.floor((Date.now() - this.lastUpdated) / 1000);
  }


  private updateTimer(): void {
    LAST_UPDATED.innerHTML = `Last updated ${this.elapsedSeconds()}s ago`;
  }

  private resetTimer(timerInterval: any) {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    LAST_UPDATED.innerHTML = 'Last updated 0s ago';
    this.lastUpdated = 0;
  }
}