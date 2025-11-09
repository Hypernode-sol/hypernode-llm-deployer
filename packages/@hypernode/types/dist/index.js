"use strict";
/**
 * @hypernode/types
 * Shared TypeScript types for the Hypernode ecosystem
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VERSION = void 0;
// Export all contract types
__exportStar(require("./contracts"), exports);
// Export all x402 types
__exportStar(require("./x402"), exports);
// Export all API types
__exportStar(require("./api"), exports);
// Export all common types and constants
__exportStar(require("./common"), exports);
// Version
exports.VERSION = '0.1.0';
