import { ClerkProvider } from "@clerk/clerk-react";
import * as bootstrap from "bootstrap";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";

import "../node_modules/@fortawesome/fontawesome-free/css/all.min.css";
import "../node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "../node_modules/bootstrap/dist/css/bootstrap.min.css";
import "../src/index.scss";
import "../src/style/css/feather.css";
import "../src/style/icon/boxicons/boxicons/css/boxicons.min.css";
import "../src/style/icon/ionic/ionicons.css";
import "../src/style/icon/tabler-icons/webfont/tabler-icons.css";
import "../src/style/icon/typicons/typicons.css";
import "../src/style/icon/weather/weathericons.css";
import { NotificationProvider } from "./contexts/NotificationContext";
import store from "./core/data/redux/store";
import { base_path } from "./environment";
import ALLRoutes from "./feature-module/router/router";
import { AuthProvider } from "./services/AuthProvider";
import { SocketProvider } from "./SocketContext";

// CRITICAL: Expose Bootstrap globally so that data-bs-toggle="dropdown" works
// Without this, Bootstrap's auto-initialization of dropdowns, modals, etc. will fail
(window as any).bootstrap = bootstrap;

// SECURITY: Clerk publishable key from environment variable
const clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  console.error("❌ SECURITY ERROR: REACT_APP_CLERK_PUBLISHABLE_KEY not found in environment variables!");
  console.error("Please add it to your .env file:");
  console.error("REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here");
}

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  // <React.StrictMode>
  <ClerkProvider
    publishableKey={clerkPubKey || ""}
    afterSignOutUrl="/"
  >
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Provider store={store}>
            <BrowserRouter basename={base_path}>
              <ALLRoutes />
            </BrowserRouter>
          </Provider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  </ClerkProvider>
  // </React.StrictMode>
);
