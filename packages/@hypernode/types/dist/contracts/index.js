"use strict";
/**
 * Smart Contract Types
 * Based on Anchor IDL definitions for Hypernode programs
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlashReason = exports.VoteChoice = exports.ProposalState = exports.GpuType = exports.NodeStatus = exports.JobState = void 0;
// ============================================================================
// Common Enums
// ============================================================================
var JobState;
(function (JobState) {
    JobState[JobState["Open"] = 0] = "Open";
    JobState[JobState["Assigned"] = 1] = "Assigned";
    JobState[JobState["Running"] = 2] = "Running";
    JobState[JobState["Completed"] = 3] = "Completed";
    JobState[JobState["Failed"] = 4] = "Failed";
    JobState[JobState["Cancelled"] = 5] = "Cancelled";
})(JobState || (exports.JobState = JobState = {}));
var NodeStatus;
(function (NodeStatus) {
    NodeStatus[NodeStatus["Registered"] = 0] = "Registered";
    NodeStatus[NodeStatus["Active"] = 1] = "Active";
    NodeStatus[NodeStatus["Busy"] = 2] = "Busy";
    NodeStatus[NodeStatus["Offline"] = 3] = "Offline";
    NodeStatus[NodeStatus["Slashed"] = 4] = "Slashed";
})(NodeStatus || (exports.NodeStatus = NodeStatus = {}));
var GpuType;
(function (GpuType) {
    GpuType[GpuType["Unknown"] = 0] = "Unknown";
    GpuType[GpuType["NvidiaRTX3090"] = 1] = "NvidiaRTX3090";
    GpuType[GpuType["NvidiaRTX4090"] = 2] = "NvidiaRTX4090";
    GpuType[GpuType["NvidiaA100"] = 3] = "NvidiaA100";
    GpuType[GpuType["NvidiaH100"] = 4] = "NvidiaH100";
    GpuType[GpuType["AMDMI250"] = 5] = "AMDMI250";
    GpuType[GpuType["AMDMI300"] = 6] = "AMDMI300";
})(GpuType || (exports.GpuType = GpuType = {}));
// ============================================================================
// Governance Program Types
// ============================================================================
var ProposalState;
(function (ProposalState) {
    ProposalState[ProposalState["Draft"] = 0] = "Draft";
    ProposalState[ProposalState["Active"] = 1] = "Active";
    ProposalState[ProposalState["Succeeded"] = 2] = "Succeeded";
    ProposalState[ProposalState["Defeated"] = 3] = "Defeated";
    ProposalState[ProposalState["Queued"] = 4] = "Queued";
    ProposalState[ProposalState["Executed"] = 5] = "Executed";
    ProposalState[ProposalState["Cancelled"] = 6] = "Cancelled";
})(ProposalState || (exports.ProposalState = ProposalState = {}));
var VoteChoice;
(function (VoteChoice) {
    VoteChoice[VoteChoice["Against"] = 0] = "Against";
    VoteChoice[VoteChoice["For"] = 1] = "For";
    VoteChoice[VoteChoice["Abstain"] = 2] = "Abstain";
})(VoteChoice || (exports.VoteChoice = VoteChoice = {}));
// ============================================================================
// Slashing Program Types
// ============================================================================
var SlashReason;
(function (SlashReason) {
    SlashReason[SlashReason["JobTimeout"] = 0] = "JobTimeout";
    SlashReason[SlashReason["InvalidResult"] = 1] = "InvalidResult";
    SlashReason[SlashReason["Offline"] = 2] = "Offline";
    SlashReason[SlashReason["MaliciousBehavior"] = 3] = "MaliciousBehavior";
})(SlashReason || (exports.SlashReason = SlashReason = {}));
