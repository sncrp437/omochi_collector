import React from "react";

interface SEOHeadDataProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogUrl?: string;
  ogType?: string;
  robots?: string;
  keywords?: string;
  twitterCard?: string;
}

/**
 * Component reusable for SEO
 */
const SEOHeadData: React.FC<SEOHeadDataProps> = React.memo(
  ({
    title,
    description,
    canonical,
    ogImage,
    ogUrl,
    ogType = "website",
    robots = "index, follow",
    keywords,
    twitterCard = "summary_large_image",
  }) => {
    // Validate và sanitize input data
    const isValidUrl = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    const sanitizeText = (text: string): string => {
      return text.trim();
    };

    const hasValidContent = (content: string | undefined): boolean => {
      return content !== undefined && sanitizeText(content).length > 0;
    };

    // Remove query parameters from URL for canonical and og:url
    const cleanUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
      } catch {
        return url;
      }
    };

    return (
      <>
        {/* Basic Meta Tags */}
        {hasValidContent(title) && <title>{sanitizeText(title!)}</title>}
        {hasValidContent(description) && (
          <meta name="description" content={sanitizeText(description!)} />
        )}
        {hasValidContent(keywords) && (
          <meta name="keywords" content={sanitizeText(keywords!)} />
        )}
        {hasValidContent(robots) && (
          <meta name="robots" content={sanitizeText(robots!)} />
        )}

        {/* Canonical URL */}
        {canonical && isValidUrl(canonical) && (
          <link rel="canonical" href={cleanUrl(canonical)} />
        )}

        {/* Open Graph Meta Tags */}
        {hasValidContent(title) && (
          <meta property="og:title" content={sanitizeText(title!)} />
        )}
        {hasValidContent(description) && (
          <meta
            property="og:description"
            content={sanitizeText(description!)}
          />
        )}
        {ogImage && isValidUrl(ogImage) && (
          <meta property="og:image" content={ogImage} />
        )}
        {ogUrl && isValidUrl(ogUrl) && (
          <meta property="og:url" content={cleanUrl(ogUrl)} />
        )}
        <meta property="og:type" content={ogType} />

        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content={twitterCard} />
        {hasValidContent(title) && (
          <meta name="twitter:title" content={sanitizeText(title!)} />
        )}
        {hasValidContent(description) && (
          <meta
            name="twitter:description"
            content={sanitizeText(description!)}
          />
        )}
        {ogImage && isValidUrl(ogImage) && (
          <meta name="twitter:image" content={ogImage} />
        )}
      </>
    );
  }
);

export default SEOHeadData;
