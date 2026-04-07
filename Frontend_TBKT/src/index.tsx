import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from './store';
import { ToastContainer, ToastContainerProps } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from "react-oidc-context";
import { authConfig } from "./configs/authConfig";
import AuthSync from "./components/auth/AuthSync";
import { FrontChannelLogoutMonitor } from "./components/auth/FrontChannelLogoutMonitor";
import { FrontChannelLogoutStatus } from "./components/auth/FrontChannelLogoutStatus";
// import { CustomSessionMonitor } from "./components/auth/CustomSessionMonitor";

const notifiConfig: ToastContainerProps = {
  limit: 3,
  autoClose: 2000,
  position: "top-right",
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  pauseOnFocusLoss: true,
  draggable: true,
  theme: 'light'
};



const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  // goi 2 lan api
  // <React.StrictMode>
  <BrowserRouter>
    <AuthProvider {...authConfig}>
      <Provider store={store}>
        <ToastContainer
          {...notifiConfig}
        />
        <AuthSync />
        {/* <CustomSessionMonitor /> */}
        {/* <FrontChannelLogoutMonitor />
        <FrontChannelLogoutStatus /> */}
        <App />
      </Provider>
    </AuthProvider>
  </BrowserRouter >
  // </React.StrictMode>
);
