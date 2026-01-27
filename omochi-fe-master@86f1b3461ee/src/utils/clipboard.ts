import { toast } from "react-toastify";

export const copyClipboard = (text: string, messageAlert = "Copy Successful!") => {
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  toast.success(messageAlert);
};
