"use strict";
/**
 * Common Types and Constants
 * Shared across the Hypernode ecosystem
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MILLISECONDS_PER_SECOND = exports.SECONDS_PER_WEEK = exports.SECONDS_PER_DAY = exports.SECONDS_PER_HOUR = exports.SECONDS_PER_MINUTE = exports.HypernodeError = exports.ErrorCode = exports.MAX_PAGE_SIZE = exports.DEFAULT_PAGE_SIZE = exports.MIN_NODE_STAKE = exports.DEFAULT_STAKE_AMOUNT = exports.DEFAULT_JOB_TIMEOUT = exports.DEFAULT_COMMITMENT = exports.LAMPORTS_PER_SOL = exports.HYPER_DEVNET = exports.HYPER_MAINNET = void 0;
/** HYPER token on mainnet */
exports.HYPER_MAINNET = {
    mint: '92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump',
    symbol: 'HYPER',
    name: 'Hypernode',
    decimals: 9,
    network: 'mainnet-beta',
};
/** HYPER token on devnet */
exports.HYPER_DEVNET = {
    mint: '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75',
    symbol: 'HYPER',
    name: 'Hypernode (Devnet)',
    decimals: 9,
    network: 'devnet',
};
// ============================================================================
// Constants
// ============================================================================
exports.LAMPORTS_PER_SOL = 1000000000;
exports.DEFAULT_COMMITMENT = 'confirmed';
exports.DEFAULT_JOB_TIMEOUT = 3600; // 1 hour
exports.DEFAULT_STAKE_AMOUNT = 10 * exports.LAMPORTS_PER_SOL; // 10 SOL
exports.MIN_NODE_STAKE = 5 * exports.LAMPORTS_PER_SOL; // 5 SOL
exports.DEFAULT_PAGE_SIZE = 20;
exports.MAX_PAGE_SIZE = 100;
// ============================================================================
// Error Types
// ============================================================================
var ErrorCode;
(function (ErrorCode) {
    // Generic errors
    ErrorCode["Unknown"] = "UNKNOWN_ERROR";
    ErrorCode["InvalidInput"] = "INVALID_INPUT";
    ErrorCode["NotFound"] = "NOT_FOUND";
    ErrorCode["Unauthorized"] = "UNAUTHORIZED";
    ErrorCode["Forbidden"] = "FORBIDDEN";
    // Blockchain errors
    ErrorCode["TransactionFailed"] = "TRANSACTION_FAILED";
    ErrorCode["InsufficientFunds"] = "INSUFFICIENT_FUNDS";
    ErrorCode["AccountNotFound"] = "ACCOUNT_NOT_FOUND";
    ErrorCode["InvalidSignature"] = "INVALID_SIGNATURE";
    // Job errors
    ErrorCode["JobNotFound"] = "JOB_NOT_FOUND";
    ErrorCode["JobAlreadyAssigned"] = "JOB_ALREADY_ASSIGNED";
    ErrorCode["JobTimeout"] = "JOB_TIMEOUT";
    ErrorCode["JobFailed"] = "JOB_FAILED";
    ErrorCode["InvalidJobState"] = "INVALID_JOB_STATE";
    // Node errors
    ErrorCode["NodeNotFound"] = "NODE_NOT_FOUND";
    ErrorCode["NodeOffline"] = "NODE_OFFLINE";
    ErrorCode["NodeBusy"] = "NODE_BUSY";
    ErrorCode["InsufficientStake"] = "INSUFFICIENT_STAKE";
    ErrorCode["NodeSlashed"] = "NODE_SLASHED";
    // Payment errors
    ErrorCode["PaymentRequired"] = "PAYMENT_REQUIRED";
    ErrorCode["PaymentFailed"] = "PAYMENT_FAILED";
    ErrorCode["PaymentExpired"] = "PAYMENT_EXPIRED";
    ErrorCode["InvalidPayment"] = "INVALID_PAYMENT";
    // Rate limiting
    ErrorCode["RateLimitExceeded"] = "RATE_LIMIT_EXCEEDED";
    ErrorCode["CircuitBreakerOpen"] = "CIRCUIT_BREAKER_OPEN";
})(ErrorCode || (exports.ErrorCode = ErrorCode = {}));
class HypernodeError extends Error {
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'HypernodeError';
    }
}
exports.HypernodeError = HypernodeError;
// ============================================================================
// Time Utils
// ============================================================================
exports.SECONDS_PER_MINUTE = 60;
exports.SECONDS_PER_HOUR = 3600;
exports.SECONDS_PER_DAY = 86400;
exports.SECONDS_PER_WEEK = 604800;
exports.MILLISECONDS_PER_SECOND = 1000;
