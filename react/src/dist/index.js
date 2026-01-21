"use strict";
exports.__esModule = true;
var react_1 = require("react");
var client_1 = require("react-dom/client");
var react_router_dom_1 = require("react-router-dom");
var environment_1 = require("./environment");
var bootstrap = require("bootstrap");
require("../node_modules/bootstrap/dist/css/bootstrap.min.css");
require("../src/style/css/feather.css");
require("../src/index.scss");
var store_1 = require("./core/data/redux/store");
var react_redux_1 = require("react-redux");
require("../src/style/icon/boxicons/boxicons/css/boxicons.min.css");
require("../src/style/icon/weather/weathericons.css");
require("../src/style/icon/typicons/typicons.css");
require("../node_modules/@fortawesome/fontawesome-free/css/fontawesome.min.css");
require("../node_modules/@fortawesome/fontawesome-free/css/all.min.css");
require("../src/style/icon/ionic/ionicons.css");
require("../src/style/icon/tabler-icons/webfont/tabler-icons.css");
var router_1 = require("./feature-module/router/router");
// Clerk
var clerk_react_1 = require("@clerk/clerk-react");
var SocketContext_1 = require("./SocketContext");
// Expose Bootstrap globally so that data-bs-toggle="dropdown" and modal work
window.bootstrap = bootstrap;
var root = client_1["default"].createRoot(document.getElementById("root"));
root.render(
// <React.StrictMode>
react_1["default"].createElement(clerk_react_1.ClerkProvider, { publishableKey: "pk_test_dXAtc2tpbmstNC5jbGVyay5hY2NvdW50cy5kZXYk", afterSignOutUrl: "/" },
    react_1["default"].createElement(SocketContext_1.SocketProvider, null,
        react_1["default"].createElement(react_redux_1.Provider, { store: store_1["default"] },
            react_1["default"].createElement(react_router_dom_1.BrowserRouter, { basename: environment_1.base_path },
                react_1["default"].createElement(router_1["default"], null)))))
// </React.StrictMode>
);
