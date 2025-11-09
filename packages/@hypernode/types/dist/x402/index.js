"use strict";
/**
 * x402 Payment Protocol Types
 * HTTP 402 Payment Required implementation for Solana
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentStatus = void 0;
// ============================================================================
// Payment Intent Types
// ============================================================================
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["Pending"] = "pending";
    PaymentStatus["Verified"] = "verified";
    PaymentStatus["Failed"] = "failed";
    PaymentStatus["Expired"] = "expired";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
