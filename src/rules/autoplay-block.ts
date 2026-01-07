import type { Rule, RuleContext } from "@/types/rule";
import { BaseRule } from "./base-rule";
import { userInteractionTracker } from "@/utils/user-interaction";
import { getAllMediaElements } from "@/utils/media";

// AutoplayBlockRule — Prevents automatic video & audio playback
export class AutoplayBlockRule extends BaseRule implements Rule {
  readonly id = "autoplay-block";

  private originalPlay: ((this: HTMLMediaElement) => Promise<void>) | null =
    null;
  private patchedMedia: WeakSet<HTMLMediaElement> = new WeakSet();
  private mutationObserver: MutationObserver | null = null;
  private mediaElements: Set<HTMLMediaElement> = new Set();

  applies(context: RuleContext): boolean {
    return context.calmModeActive;
  }

  apply(context: RuleContext): void {
    if (this.originalPlay !== null) return;

    // Store original play method
    this.originalPlay = HTMLMediaElement.prototype.play;

    const self = this;
    HTMLMediaElement.prototype.play = function (
      this: HTMLMediaElement
    ): Promise<void> {
      // Check if this was user-initiated
      if (!userInteractionTracker.wasUserInitiated()) {
        // Auto-play attempt — prevent it
        console.log("[AutoplayBlock] Blocked autoplay attempt");
        return Promise.reject(
          new DOMException("Autoplay blocked by Overstim Guard")
        );
      }

      // User-initiated — allow play
      return self.originalPlay!.call(this);
    };

    this.handleExistingMedia();

    // Watch for newly added media
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if the added node is a media element
            if (
              element instanceof HTMLVideoElement ||
              element instanceof HTMLAudioElement
            ) {
              this.handleMediaElement(element);
            }

            // Check for media elements within the added node
            const mediaElements = element.querySelectorAll?.("video, audio");
            if (mediaElements) {
              mediaElements.forEach((el) => {
                if (
                  el instanceof HTMLVideoElement ||
                  el instanceof HTMLAudioElement
                ) {
                  this.handleMediaElement(el);
                }
              });
            }
          }
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Pause any currently playing media
    getAllMediaElements().forEach((media) => {
      if (!media.paused && !userInteractionTracker.wasUserInitiated()) {
        media.pause();
      }
    });
  }

  private handleExistingMedia(): void {
    getAllMediaElements().forEach((media) => this.handleMediaElement(media));
  }

  private handleMediaElement(media: HTMLMediaElement): void {
    if (this.patchedMedia.has(media)) return; // Already handled

    this.patchedMedia.add(media);
    this.mediaElements.add(media);

    // Remove autoplay attribute if present
    if (media.hasAttribute("autoplay")) media.removeAttribute("autoplay");

    if (!media.paused && !userInteractionTracker.wasUserInitiated()) {
      media.pause();
    }
  }

  override revert(): void {
    // Restore original play method
    if (this.originalPlay !== null) {
      HTMLMediaElement.prototype.play = this.originalPlay;
      this.originalPlay = null;
    }

    // Stop mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    // Clear tracking
    this.patchedMedia = new WeakSet();
    this.mediaElements.clear();

    super.revert();
  }
}
