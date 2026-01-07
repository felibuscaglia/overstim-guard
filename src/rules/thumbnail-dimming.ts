import type { Rule, RuleContext } from "@/types/rule";
import { BaseRule } from "./base-rule";
import { injectStyle } from "@/utils/dom";

/**
 * ThumbnailDimmingRule — Reduces dopamine-heavy visual cues
 *
 * Lowers saturation and brightness on video thumbnails and large image previews
 */
export class ThumbnailDimmingRule extends BaseRule implements Rule {
  readonly id = "thumbnail-dimming";

  private injectedStyle: HTMLStyleElement | null = null;

  override applies(context: RuleContext): boolean {
    return context.calmModeActive;
  }

  override apply(context: RuleContext): void {
    if (this.injectedStyle !== null) return;

    // Inject CSS to dim thumbnails
    const css = `
    /* Video thumbnails */
    img[src*="thumbnail"],
    img[src*="thumb"],
    img[alt*="thumbnail"],
    img[alt*="video"],
    video[poster],
    [class*="thumbnail"] img,
    [class*="thumb"] img,
    [id*="thumbnail"] img,
    [id*="thumb"] img {
      filter: saturate(0.6) brightness(0.85) !important;
      transition: filter 0.3s ease !important;
    }

    /* Large image previews (likely thumbnails) */
    img[width][height] {
      filter: saturate(0.6) brightness(0.85) !important;
      transition: filter 0.3s ease !important;
    }

    /* YouTube specific */
    ytd-thumbnail img,
    ytd-thumbnail video,
    #thumbnail img,
    #thumbnail video {
      filter: saturate(0.6) brightness(0.85) !important;
    }

    /* Reddit specific */
    [data-testid="post-content"] img,
    [class*="Post"] img {
      filter: saturate(0.6) brightness(0.85) !important;
    }

    /* Twitter/X specific */
    img[alt*="Image"],
    [data-testid="tweet"] img {
      filter: saturate(0.6) brightness(0.85) !important;
    }

    /* Hover state - slightly restore on hover for UX */
    img:hover,
    video:hover {
      filter: saturate(0.75) brightness(0.9) !important;
    }
  `;

    this.injectedStyle = injectStyle(css);
    this.trackStyle(this.injectedStyle);
  }

  override revert(): void {
    if (this.injectedStyle) {
      this.injectedStyle.remove();
      this.injectedStyle = null;
    }

    super.revert();
  }
}
