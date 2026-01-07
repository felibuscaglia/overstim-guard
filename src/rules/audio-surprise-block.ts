import { Rule, RuleContext } from "@/types/rule";
import { BaseRule } from "./base-rule";
import { getAllMediaElements, hasAudioTrack } from "@/utils/media";
import { userInteractionTracker } from "@/utils/user-interaction";

/**
 * AudioSurpriseBlockRule — Prevents unexpected sound
 *
 * Blocks auto-playing audio and forces muted state unless user explicitly unmutes
 */
export class AudioSurpriseBlockRule extends BaseRule implements Rule {
  readonly id = "audio-surprise-block";

  private mediaStates: Map<
    HTMLMediaElement,
    {
      originalMuted: boolean;
      originalAutoplay: boolean;
    }
  > = new Map();

  private mutationObserver: MutationObserver | null = null;
  private playListener: ((e: Event) => void) | null = null;

  override applies(context: RuleContext): boolean {
    return context.calmModeActive;
  }

  override apply(context: RuleContext): void {
    if (this.mutationObserver !== null) return;

    this.handleExistingMedia();

    // Watch for new media elements
    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            if (
              element instanceof HTMLVideoElement ||
              element instanceof HTMLAudioElement
            ) {
              this.handleMediaElement(
                element as HTMLVideoElement | HTMLAudioElement
              );
            }

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

    // Listen for play events to enforce mute
    this.playListener = (e: Event) => {
      const media = e.target as HTMLMediaElement;

      if (!userInteractionTracker.wasUserInitiated()) {
        // Auto-play detected — force mute
        if (!media.muted && hasAudioTrack(media)) {
          media.muted = true;
          console.log("[AudioSurpriseBlock] Muted auto-playing media");
        }
      }
    };

    document.addEventListener("play", this.playListener, true);
  }

  private handleExistingMedia(): void {
    getAllMediaElements().forEach((media) => {
      this.handleMediaElement(media);
    });
  }

  private handleMediaElement(media: HTMLVideoElement | HTMLAudioElement): void {
    if (this.mediaStates.has(media)) return;

    // Only handle media with audio
    if (!hasAudioTrack(media)) return;

    const originalMuted = media.muted;
    const originalAutoplay = media.hasAttribute("autoplay");

    // Force mute if not user-initiated
    if (userInteractionTracker.wasUserInitiated()) {
      media.muted = true;
    }

    // Remove autoplay attribute
    if (originalAutoplay) media.removeAttribute("autoplay");

    this.mediaStates.set(media, {
      originalMuted,
      originalAutoplay,
    });
  }

  override revert(): void {
    this.mediaStates.forEach((state, media) => {
      media.muted = state.originalMuted;

      if (state.originalAutoplay) {
        media.setAttribute("autoplay", "");
      } else {
        media.removeAttribute("autoplay");
      }
    });

    this.mediaStates.clear();

    if (this.playListener) {
      document.removeEventListener("play", this.playListener, true);
      this.playListener = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    super.revert();
  }
}
