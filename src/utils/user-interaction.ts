class UserInteractionTracker {
  private userInteracted = false;
  private listeners: (() => void)[] = [];

  constructor() {
    // Track various user interaction events
    const events = ["click", "touchstart", "keydown", "mousedown"];

    const handler = () => {
      this.userInteracted = true;

      // Reset after a short delay to allow for programmatic calls
      setTimeout(() => {
        this.userInteracted = false;
      }, 100);
    };

    events.forEach((event) => {
      document.addEventListener(event, handler, {
        capture: true,
        passive: true,
      });

      this.listeners.push(() => {
        document.removeEventListener(event, handler, { capture: true });
      });
    });
  }

  // Check if the last action was user-initiated
  wasUserInitiated(): boolean {
    return this.userInteracted;
  }

  // Mark that user interaction occurred
  markUserInteraction(): void {
    this.userInteracted = true;

    setTimeout(() => {
      this.userInteracted = false;
    }, 100);
  }

  // Cleanup listeners
  cleanup(): void {
    this.listeners.forEach((cleanup) => cleanup());
    this.listeners = [];
  }
}

export const userInteractionTracker = new UserInteractionTracker();
