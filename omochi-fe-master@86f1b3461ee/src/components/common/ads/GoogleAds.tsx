import { useEffect, useRef, useState } from "react";

interface GoogleAdsProps {
  adClient: string;
  adSlot: string;
  style?: React.CSSProperties;
}

const GoogleAds: React.FC<GoogleAdsProps> = ({ adClient, adSlot, style }) => {
  const adRef = useRef<HTMLModElement>(null);
  // null = checking, true = show, false = hide
  const [shouldShow, setShouldShow] = useState<boolean | null>(null);
  const observerRef = useRef<MutationObserver | null>(null);
  const iframeCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pushAdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevPropsRef = useRef<{ adClient: string; adSlot: string } | null>(
    null
  );

  useEffect(() => {
    const node = adRef.current;
    if (!node) return;

    // Reset state on mount (SPA navigation)
    setShouldShow(null);

    // Check if props changed (new ad slot or remount)
    const propsChanged =
      !prevPropsRef.current ||
      prevPropsRef.current.adClient !== adClient ||
      prevPropsRef.current.adSlot !== adSlot;

    if (propsChanged) {
      // Clear status attributes to allow Google Ads to process this element
      node.removeAttribute("data-adsbygoogle-status");
      node.removeAttribute("data-ad-status");
    }

    prevPropsRef.current = { adClient, adSlot };

    // Check if iframe has actual content
    // Note: Don't check about:blank too early - Google may use it temporarily during load
    const hasIframeContent = (iframe: HTMLIFrameElement): boolean => {
      try {
        // Primary check: iframe must have height > 0
        const iframeHeight = iframe.offsetHeight || iframe.clientHeight;
        if (iframeHeight === 0) {
          return false;
        }

        // Must have width > 0
        const iframeWidth = iframe.offsetWidth || iframe.clientWidth;
        if (iframeWidth === 0) {
          return false;
        }

        // Must be visible
        const computedStyle = window.getComputedStyle(iframe);
        if (
          computedStyle.display === "none" ||
          computedStyle.visibility === "hidden"
        ) {
          return false;
        }

        // If height > 0 and visible, assume it has content
        return true;
      } catch {
        // On error (e.g., CORS), assume content exists to avoid hiding valid ads
        return true;
      }
    };

    // Helper: check iframe and set visibility
    const checkAndSetVisibility = (iframe: HTMLIFrameElement | null) => {
      if (iframe && hasIframeContent(iframe)) {
        setShouldShow(true);
        return true;
      }
      return false;
    };

    // Check iframe content when it's created
    // Wait long enough for Google to fill ads (can take 1-2s)
    const checkIframeContent = (adNode: HTMLElement) => {
      if (iframeCheckTimeoutRef.current) {
        clearTimeout(iframeCheckTimeoutRef.current);
      }

      iframeCheckTimeoutRef.current = setTimeout(() => {
        const iframe = adNode.querySelector("iframe");

        if (!iframe) {
          // No iframe yet, retry once more
          iframeCheckTimeoutRef.current = setTimeout(() => {
            const retryIframe = adNode.querySelector("iframe");
            if (!retryIframe) {
              // Still no iframe after 2 checks, likely unfilled
              setShouldShow(false);
            } else if (!checkAndSetVisibility(retryIframe)) {
              // Iframe exists but no content yet, wait once more
              iframeCheckTimeoutRef.current = setTimeout(() => {
                const finalIframe = adNode.querySelector("iframe");
                if (!checkAndSetVisibility(finalIframe)) {
                  setShouldShow(false);
                }
              }, 1000);
            }
          }, 1500);
          return;
        }

        // Check if iframe has content
        if (!checkAndSetVisibility(iframe)) {
          // No content yet, wait once more (Google may still be loading)
          iframeCheckTimeoutRef.current = setTimeout(() => {
            const retryIframe = adNode.querySelector("iframe");
            if (!checkAndSetVisibility(retryIframe)) {
              setShouldShow(false);
            }
          }, 1000);
        }
      }, 800);
    };

    const checkAdStatus = () => {
      const status = node.getAttribute("data-ad-status");

      if (status === "filled") {
        // Status is filled, verify iframe actually has content
        checkIframeContent(node);
      } else if (status === "unfilled") {
        setShouldShow(false);
      }
    };

    // Watch for status changes and iframe insertion
    observerRef.current = new MutationObserver((mutations) => {
      checkAdStatus();

      // Check if iframe was added
      mutations.forEach((mutation) => {
        if (mutation.type === "childList") {
          mutation.addedNodes.forEach((addedNode) => {
            if (addedNode.nodeName === "IFRAME") {
              checkIframeContent(node);
            }
          });
        }
      });
    });

    observerRef.current.observe(node, {
      attributes: true,
      attributeFilter: ["data-ad-status", "data-adsbygoogle-status"],
      childList: true,
      subtree: true,
    });

    // Push ad request to Google Ads script
    // Wait until container has width > 0 before pushing
    const pushAd = () => {
      if (!node) return;
      // Already processed, don't push again
      if (node.getAttribute("data-adsbygoogle-status") === "done") return;

      const width = node.offsetWidth;
      if (width > 0) {
        try {
          if (!window.adsbygoogle) window.adsbygoogle = [];
          window.adsbygoogle.push({});
        } catch (e) {
          // Ignore "already have ads" error
          console.error(e);
          setShouldShow(false);
        }
      } else {
        // Retry if width is still 0
        pushAdTimeoutRef.current = setTimeout(pushAd, 200);
      }
    };

    pushAd();

    // Helper: handle status check (used to avoid duplicate logic)
    const handleStatusCheck = (status: string | null) => {
      if (status === "unfilled") {
        setShouldShow(false);
      } else if (status === "filled") {
        checkIframeContent(node);
      }
    };

    // Fallback timeout: wait long enough for Google to fill ads
    // Google Ads can take 5-10s to load, especially on first request
    const timeoutId = setTimeout(() => {
      const status = node.getAttribute("data-ad-status");
      handleStatusCheck(status);

      // No status yet, wait a bit more before deciding
      if (!status) {
        fallbackTimeoutRef.current = setTimeout(() => {
          const finalStatus = node.getAttribute("data-ad-status");
          handleStatusCheck(finalStatus);
          // Still no status - might be loading, don't hide yet
        }, 2000);
      }
    }, 8000);

    return () => {
      clearTimeout(timeoutId);
      if (iframeCheckTimeoutRef.current) {
        clearTimeout(iframeCheckTimeoutRef.current);
        iframeCheckTimeoutRef.current = null;
      }
      if (pushAdTimeoutRef.current) {
        clearTimeout(pushAdTimeoutRef.current);
        pushAdTimeoutRef.current = null;
      }
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      observerRef.current?.disconnect();
    };
  }, [adClient, adSlot]);

  // Only return null when definitely unfilled
  // Keep element in DOM (even hidden) so Google Ads script can find and fill it
  if (shouldShow === false) return null;

  return (
    <ins
      ref={adRef}
      className="adsbygoogle"
      style={{
        // Show only when shouldShow === true
        // When null (checking), render but hide so Google can still fill
        display: shouldShow === true ? "block" : "none",
        visibility: shouldShow === true ? "visible" : "hidden",
        ...style,
      }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
};

export default GoogleAds;
