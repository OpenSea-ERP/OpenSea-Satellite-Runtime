"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateBanner = UpdateBanner;
const jsx_runtime_1 = require("react/jsx-runtime");
const containerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9990,
    padding: "10px 16px",
    fontFamily: "system-ui, -apple-system, sans-serif",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
};
const colorByStatus = {
    checking: { background: "#dbeafe", color: "#1e40af" },
    available: { background: "#fef3c7", color: "#92400e" },
    downloading: { background: "#dbeafe", color: "#1e40af" },
    downloaded: { background: "#d1fae5", color: "#065f46" },
    error: { background: "#fee2e2", color: "#991b1b" },
};
const buttonStyle = {
    marginLeft: "auto",
    background: "rgba(255, 255, 255, 0.4)",
    border: "1px solid rgba(0, 0, 0, 0.15)",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
};
const dismissStyle = {
    ...buttonStyle,
    marginLeft: 6,
    background: "transparent",
    border: "1px solid transparent",
};
function statusLabel(status, version, progress, errorMessage) {
    switch (status) {
        case "checking":
            return "Verificando atualizações...";
        case "available":
            return version ? `Atualização ${version} disponível.` : "Atualização disponível.";
        case "downloading":
            return progress !== undefined
                ? `Baixando atualização: ${Math.round(progress)}%`
                : "Baixando atualização...";
        case "downloaded":
            return version
                ? `Atualização ${version} pronta para instalar.`
                : "Atualização pronta para instalar.";
        case "error":
            return errorMessage
                ? `Erro ao atualizar: ${errorMessage}`
                : "Erro ao atualizar.";
    }
}
function UpdateBanner({ status, version, progress, errorMessage, onInstall, onDismiss, className, installLabel = "Reiniciar e instalar", dismissLabel = "Fechar", }) {
    return ((0, jsx_runtime_1.jsxs)("div", { style: { ...containerStyle, ...colorByStatus[status] }, className: className, role: "status", children: [(0, jsx_runtime_1.jsx)("span", { children: statusLabel(status, version, progress, errorMessage) }), status === "downloaded" && onInstall && ((0, jsx_runtime_1.jsx)("button", { type: "button", style: buttonStyle, onClick: onInstall, children: installLabel })), onDismiss && status !== "downloaded" && ((0, jsx_runtime_1.jsx)("button", { type: "button", style: dismissStyle, onClick: onDismiss, children: dismissLabel }))] }));
}
//# sourceMappingURL=UpdateBanner.js.map