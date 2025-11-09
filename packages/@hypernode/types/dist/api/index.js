"use strict";
/**
 * API Types
 * HTTP REST and WebSocket API types for Hypernode services
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsMessageType = void 0;
// ============================================================================
// WebSocket Types
// ============================================================================
var WsMessageType;
(function (WsMessageType) {
    // Client -> Server
    WsMessageType["Subscribe"] = "subscribe";
    WsMessageType["Unsubscribe"] = "unsubscribe";
    WsMessageType["Ping"] = "ping";
    // Server -> Client
    WsMessageType["JobUpdate"] = "job_update";
    WsMessageType["NodeUpdate"] = "node_update";
    WsMessageType["MarketUpdate"] = "market_update";
    WsMessageType["PaymentUpdate"] = "payment_update";
    WsMessageType["Error"] = "error";
    WsMessageType["Pong"] = "pong";
})(WsMessageType || (exports.WsMessageType = WsMessageType = {}));
