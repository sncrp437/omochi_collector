import { toast, Id } from "react-toastify";

let currentToastId: Id | null = null;

export const showGlobalToastError = (message: string) => {
  if (currentToastId !== null) {
    toast.update(currentToastId, {
      render: message,
      type: "error",
      autoClose: 5000,
      position: "top-center",
    });
  } else {
    currentToastId = toast.error(message, {
      position: "top-center",
      autoClose: 5000,
      onClose: () => {
        currentToastId = null;
      },
    });
  }
};

export const resetGlobalToast = () => {
  if (currentToastId !== null) {
    toast.dismiss(currentToastId);
    currentToastId = null;
  }
};
