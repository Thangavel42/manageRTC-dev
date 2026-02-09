"use strict";
exports.__esModule = true;
var clerk_react_1 = require("@clerk/clerk-react");
var bootstrap = require("bootstrap");
var client_1 = require("react-dom/client");
var react_redux_1 = require("react-redux");
var react_router_dom_1 = require("react-router-dom");
require("../node_modules/@fortawesome/fontawesome-free/css/all.min.css");
require("../node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css");
require("../node_modules/bootstrap/dist/css/bootstrap.min.css");
require("../src/index.scss");
require("../src/style/css/feather.css");
require("../src/style/icon/boxicons/boxicons/css/boxicons.min.css");
require("../src/style/icon/ionic/ionicons.css");
require("../src/style/icon/tabler-icons/webfont/tabler-icons.css");
require("../src/style/icon/typicons/typicons.css");
require("../src/style/icon/weather/weathericons.css");
var NotificationContext_1 = require("./contexts/NotificationContext");
var store_1 = require("./core/data/redux/store");
var environment_1 = require("./environment");
var router_1 = require("./feature-module/router/router");
var AuthProvider_1 = require("./services/AuthProvider");
var SocketContext_1 = require("./SocketContext");
// CRITICAL: Expose Bootstrap globally so that data-bs-toggle="dropdown" works
// Without this, Bootstrap's auto-initialization of dropdowns, modals, etc. will fail
window.bootstrap = bootstrap;
// SECURITY: Clerk publishable key from environment variable
var clerkPubKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) {
    console.error("❌ SECURITY ERROR: REACT_APP_CLERK_PUBLISHABLE_KEY not found in environment variables!");
    console.error("Please add it to your .env file:");
    console.error("REACT_APP_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here");
}
var root = client_1["default"].createRoot(document.getElementById("root"));
root.render(
// <React.StrictMode>
React.createElement(clerk_react_1.ClerkProvider, { publishableKey: clerkPubKey || "", afterSignOutUrl: "/" },
    React.createElement(AuthProvider_1.AuthProvider, null,
        React.createElement(SocketContext_1.SocketProvider, null,
            React.createElement(NotificationContext_1.NotificationProvider, null,
                React.createElement(react_redux_1.Provider, { store: store_1["default"] },
                    React.createElement(react_router_dom_1.BrowserRouter, { basename: environment_1.base_path },
                        React.createElement(router_1["default"], null)))))))
// </React.StrictMode>
);
