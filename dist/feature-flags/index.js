"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.snapshot = exports.getString = exports.isEnabled = exports.stopFeatureFlags = exports.setupFeatureFlags = void 0;
var feature_flags_1 = require("./feature-flags");
Object.defineProperty(exports, "setupFeatureFlags", { enumerable: true, get: function () { return feature_flags_1.setupFeatureFlags; } });
Object.defineProperty(exports, "stopFeatureFlags", { enumerable: true, get: function () { return feature_flags_1.stopFeatureFlags; } });
Object.defineProperty(exports, "isEnabled", { enumerable: true, get: function () { return feature_flags_1.isEnabled; } });
Object.defineProperty(exports, "getString", { enumerable: true, get: function () { return feature_flags_1.getString; } });
Object.defineProperty(exports, "snapshot", { enumerable: true, get: function () { return feature_flags_1.snapshot; } });
//# sourceMappingURL=index.js.map