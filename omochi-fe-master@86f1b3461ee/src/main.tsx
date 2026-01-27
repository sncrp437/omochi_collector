import { RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import router from "./router";
import { store } from "./store";
import "./index.css";
import "@ant-design/v5-patch-for-react-19";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles/toast.css";
import "./i18n/locales";
import { CookiesProvider } from "react-cookie";
import { registerServiceWorker } from "./utils/serviceWorker";

// Register service worker for FCM
registerServiceWorker();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CookiesProvider>
      <Provider store={store}>
        <RouterProvider router={router} />
        <ToastContainer
          position="top-center"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </Provider>
    </CookiesProvider>
  </React.StrictMode>
);
