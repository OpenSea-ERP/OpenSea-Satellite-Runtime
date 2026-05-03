"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RevokedDialog = RevokedDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const overlayStyle = {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    fontFamily: "system-ui, -apple-system, sans-serif",
};
const cardStyle = {
    background: "#fff",
    color: "#0f172a",
    borderRadius: 12,
    padding: 32,
    maxWidth: 480,
    width: "calc(100% - 48px)",
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
};
const titleStyle = {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 12,
};
const messageStyle = {
    fontSize: 14,
    lineHeight: 1.5,
    marginBottom: 24,
    color: "#475569",
};
const buttonStyle = {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 20px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
};
function RevokedDialog({ open, reason, appName, onAck, className, ackLabel = "Voltar ao pareamento", title = "Pareamento revogado", message, }) {
    if (!open)
        return null;
    const defaultMessage = ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: ["O pareamento deste dispositivo com o ", appName, " foi revogado pelo administrador", reason ? ` (motivo: ${reason})` : "", ". Para continuar usando o app, \u00E9 preciso reaprovar o dispositivo no painel administrativo."] }));
    return ((0, jsx_runtime_1.jsx)("div", { style: overlayStyle, className: className, role: "alertdialog", "aria-modal": "true", children: (0, jsx_runtime_1.jsxs)("div", { style: cardStyle, children: [(0, jsx_runtime_1.jsx)("div", { style: titleStyle, children: title }), (0, jsx_runtime_1.jsx)("div", { style: messageStyle, children: message ?? defaultMessage }), (0, jsx_runtime_1.jsx)("button", { type: "button", style: buttonStyle, onClick: onAck, children: ackLabel })] }) }));
}
//# sourceMappingURL=RevokedDialog.js.map