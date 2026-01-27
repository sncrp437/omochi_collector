import QRCodeStyling from "qr-code-styling";

export const BASE_TWEET_URL = "https://twitter.com/intent/tweet";
export const BASE_FACEBOOK_URL = "https://www.facebook.com/sharer/sharer.php";
export const BASE_LINE_URL = "https://social-plugins.line.me/lineit/share";
export const BASE_EMAIL_URL = "mailto:";
export const BASE_INSTAGRAM_URL = "https://www.instagram.com";
export const BASE_TIKTOK_URL = "https://www.tiktok.com";

export const getShareUrlTwitter = (text: string, hashtags = "") => {
  const data = `text=${text}`;
  return `${BASE_TWEET_URL}?${encodeURI(data)}${encodeURIComponent(hashtags)}`;
};

export const getShareUrlFacebook = (url: string) => {
  const params = new URLSearchParams({
    u: url,
  });
  return `${BASE_FACEBOOK_URL}?${params.toString()}`;
};

export const getShareUrlLine = (text: string, url: string) => {
  return `${BASE_LINE_URL}?url=${encodeURIComponent(
    url
  )}&text=${encodeURIComponent(text)}`;
};

export const getShareUrlEmail = (subject: string, body: string) => {
  return `${BASE_EMAIL_URL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
};

export const getShareUrlInstagram = () => {
  return `${BASE_INSTAGRAM_URL}`;
};

export const getShareUrlTikTok = () => {
  return `${BASE_TIKTOK_URL}`;
};


export const handleDownloadQR = (data: string) => {
  const qrCode = new QRCodeStyling({
    width: 300,
    height: 300,
    type: "canvas",
    data: data,
    dotsOptions: {
      color: "#000000",
      type: "rounded",
    },
    backgroundOptions: {
      color: "#ffffff",
    },
    cornersSquareOptions: {
      type: "extra-rounded",
    },
    cornersDotOptions: {
      type: "dot",
    },
  });

  qrCode.download({ name: "store-qr", extension: "png" });
};
