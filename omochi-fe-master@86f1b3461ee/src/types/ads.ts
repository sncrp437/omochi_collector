import { HTMLAttributes } from "react";

// Google AdSense types
declare global {
  interface Window {
    adsbygoogle: Array<Record<string, unknown>>;
  }
}

export interface GoogleAdSenseConfig {
  "data-ad-client": string;
  "data-ad-slot": string;
  "data-ad-format": string;
  "data-full-width-responsive": string;
}

export interface AdSenseElement extends HTMLAttributes<HTMLElement> {
  "data-ad-client": string;
  "data-ad-slot": string;
  "data-ad-format": string;
  "data-full-width-responsive": string;
}
