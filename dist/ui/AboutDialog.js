"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AboutDialog = AboutDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
    fontFamily: "system-ui, -apple-system, sans-serif",
};
const cardStyle = {
    background: "#fff",
    color: "#0f172a",
    borderRadius: 12,
    padding: 28,
    maxWidth: 420,
    width: "calc(100% - 48px)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
};
const headerStyle = {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 4,
};
const versionStyle = {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
};
const linkListStyle = {
    listStyle: "none",
    padding: 0,
    margin: "0 0 16px 0",
};
const linkItemStyle = {
    marginBottom: 6,
};
const linkStyle = {
    color: "#2563eb",
    textDecoration: "none",
};
const closeButtonStyle = {
    background: "#e2e8f0",
    color: "#0f172a",
    border: "none",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
};
const copyrightStyle = {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 16,
    textAlign: "center",
};
function AboutDialog({ open, onClose, appName, appVersion, channel, build, links = [], copyright, className, closeLabel = "Fechar", }) {
    if (!open)
        return null;
    return ((0, jsx_runtime_1.jsx)("div", { style: overlayStyle, className: className, role: "dialog", "aria-modal": "true", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { style: cardStyle, onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsx)("div", { style: headerStyle, children: appName }), (0, jsx_runtime_1.jsxs)("div", { style: versionStyle, children: ["vers\u00E3o ", appVersion, channel ? ` (${channel})` : "", build ? ` — build ${build}` : ""] }), links.length > 0 && ((0, jsx_runtime_1.jsx)("ul", { style: linkListStyle, children: links.map((l) => ((0, jsx_runtime_1.jsx)("li", { style: linkItemStyle, children: (0, jsx_runtime_1.jsx)("a", { href: l.href, style: linkStyle, target: "_blank", rel: "noreferrer", children: l.label }) }, l.href))) })), (0, jsx_runtime_1.jsx)("div", { style: { display: "flex", justifyContent: "flex-end" }, children: (0, jsx_runtime_1.jsx)("button", { type: "button", style: closeButtonStyle, onClick: onClose, children: closeLabel }) }), copyright && (0, jsx_runtime_1.jsx)("div", { style: copyrightStyle, children: copyright })] }) }));
}
//# sourceMappingURL=AboutDialog.js.map