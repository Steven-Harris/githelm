import { getLastUpdated } from "./storage";

export class LastUpdated {

  public lastUpdated: number = $state(0);
  private timer: any | undefined;
  public startTimer() {
    if (this.timer) {
      this.resetTimer(this.timer);
    }
    this.elapsedSeconds()

    this.timer = setInterval(() => this.elapsedSeconds(), 1000);
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

  private resetTimer(timerInterval: any) {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    this.lastUpdated = 0;
  }
}

