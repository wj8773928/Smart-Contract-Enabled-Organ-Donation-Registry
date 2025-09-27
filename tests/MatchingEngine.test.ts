import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DONOR = 101;
const ERR_INVALID_RECIPIENT = 102;
const ERR_NO_MATCH = 103;
const ERR_INVALID_ORGAN_TYPE = 104;
const ERR_INVALID_BLOOD_TYPE = 105;
const ERR_INVALID_URGENCY = 106;
const ERR_INVALID_LOCATION = 107;
const ERR_INVALID_SCORE = 108;
const ERR_MATCH_ALREADY_EXISTS = 109;
const ERR_INVALID_TIMESTAMP = 110;
const ERR_RECIPIENT_NOT_WAITING = 111;
const ERR_DONOR_NOT_AVAILABLE = 112;
const ERR_INVALID_PRIORITY = 113;
const ERR_INVALID_COMPATIBILITY = 114;
const ERR_MAX_MATCHES_EXCEEDED = 115;
const ERR_INVALID_ALLOCATION_RULE = 116;
const ERR_ORACLE_NOT_VERIFIED = 117;
const ERR_INVALID_HEALTH_STATUS = 118;
const ERR_INVALID_AGE = 119;
const ERR_INVALID_WEIGHT = 120;

interface Match {
  donorId: number;
  recipientId: number;
  organType: string;
  bloodType: string;
  urgencyLevel: number;
  locationScore: number;
  waitTime: number;
  matchScore: number;
  timestamp: number;
  status: boolean;
}

interface DonorScore {
  compatibilityScore: number;
  healthStatus: number;
  age: number;
  weight: number;
}

interface RecipientPriority {
  priorityScore: number;
  urgency: number;
  waitDays: number;
}

interface AllocationRule {
  weightUrgency: number;
  weightWait: number;
  weightLocation: number;
  minScore: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class MatchingEngineMock {
  state: {
    nextMatchId: number;
    maxMatches: number;
    matchingFee: number;
    oracleContract: string | null;
    admin: string;
    matches: Map<number, Match>;
    donorScores: Map<number, DonorScore>;
    recipientPriorities: Map<number, RecipientPriority>;
    allocationRules: Map<number, AllocationRule>;
  } = {
    nextMatchId: 0,
    maxMatches: 10000,
    matchingFee: 500,
    oracleContract: null,
    admin: "ST1ADMIN",
    matches: new Map(),
    donorScores: new Map(),
    recipientPriorities: new Map(),
    allocationRules: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextMatchId: 0,
      maxMatches: 10000,
      matchingFee: 500,
      oracleContract: null,
      admin: "ST1ADMIN",
      matches: new Map(),
      donorScores: new Map(),
      recipientPriorities: new Map(),
      allocationRules: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
  }

  setOracleContract(contractPrincipal: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.oracleContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setMaxMatches(newMax: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.maxMatches = newMax;
    return { ok: true, value: true };
  }

  setMatchingFee(newFee: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.matchingFee = newFee;
    return { ok: true, value: true };
  }

  addAllocationRule(ruleId: number, weightUrgency: number, weightWait: number, weightLocation: number, minScore: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.allocationRules.set(ruleId, { weightUrgency, weightWait, weightLocation, minScore });
    return { ok: true, value: true };
  }

  registerDonorScore(donorId: number, compatibility: number, health: number, age: number, weight: number): Result<boolean> {
    if (compatibility > 100) return { ok: false, value: ERR_INVALID_COMPATIBILITY };
    if (health < 1 || health > 10) return { ok: false, value: ERR_INVALID_HEALTH_STATUS };
    if (age < 18 || age > 80) return { ok: false, value: ERR_INVALID_AGE };
    if (weight < 40 || weight > 150) return { ok: false, value: ERR_INVALID_WEIGHT };
    this.state.donorScores.set(donorId, { compatibilityScore: compatibility, healthStatus: health, age, weight });
    return { ok: true, value: true };
  }

  registerRecipientPriority(recipientId: number, priority: number, urgency: number, waitDays: number): Result<boolean> {
    if (priority > 100) return { ok: false, value: ERR_INVALID_PRIORITY };
    if (urgency < 1 || urgency > 5) return { ok: false, value: ERR_INVALID_URGENCY };
    this.state.recipientPriorities.set(recipientId, { priorityScore: priority, urgency, waitDays });
    return { ok: true, value: true };
  }

  executeMatch(
    donorId: number,
    recipientId: number,
    organType: string,
    bloodType: string,
    urgencyLevel: number,
    locationScore: number,
    waitTime: number,
    ruleId: number
  ): Result<number> {
    if (this.state.nextMatchId >= this.state.maxMatches) return { ok: false, value: ERR_MAX_MATCHES_EXCEEDED };
    if (!["heart", "liver", "kidney", "lung"].includes(organType)) return { ok: false, value: ERR_INVALID_ORGAN_TYPE };
    if (!["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].includes(bloodType)) return { ok: false, value: ERR_INVALID_BLOOD_TYPE };
    if (urgencyLevel < 1 || urgencyLevel > 5) return { ok: false, value: ERR_INVALID_URGENCY };
    if (locationScore > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!this.state.donorScores.has(donorId)) return { ok: false, value: ERR_INVALID_DONOR };
    if (!this.state.recipientPriorities.has(recipientId)) return { ok: false, value: ERR_INVALID_RECIPIENT };
    if (!this.state.oracleContract) return { ok: false, value: ERR_ORACLE_NOT_VERIFIED };
    const rule = this.state.allocationRules.get(ruleId);
    if (!rule) return { ok: false, value: ERR_INVALID_ALLOCATION_RULE };
    const score = urgencyLevel * rule.weightUrgency + waitTime * rule.weightWait + locationScore * rule.weightLocation;
    if (score < 50) return { ok: false, value: ERR_INVALID_SCORE };
    this.stxTransfers.push({ amount: this.state.matchingFee, from: this.caller, to: this.state.oracleContract });
    const id = this.state.nextMatchId;
    this.state.matches.set(id, {
      donorId,
      recipientId,
      organType,
      bloodType,
      urgencyLevel,
      locationScore,
      waitTime,
      matchScore: score,
      timestamp: this.blockHeight,
      status: true,
    });
    this.state.nextMatchId++;
    return { ok: true, value: id };
  }

  updateMatchStatus(matchId: number, newStatus: boolean): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const match = this.state.matches.get(matchId);
    if (!match) return { ok: false, value: ERR_NO_MATCH };
    this.state.matches.set(matchId, { ...match, status: newStatus });
    return { ok: true, value: true };
  }

  getMatchCount(): Result<number> {
    return { ok: true, value: this.state.nextMatchId };
  }

  getMatch(id: number): Match | null {
    return this.state.matches.get(id) || null;
  }
}

describe("MatchingEngine", () => {
  let contract: MatchingEngineMock;

  beforeEach(() => {
    contract = new MatchingEngineMock();
    contract.reset();
  });

  it("sets oracle contract successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.setOracleContract("ST2ORACLE");
    expect(result.ok).toBe(true);
    expect(contract.state.oracleContract).toBe("ST2ORACLE");
  });

  it("adds allocation rule successfully", () => {
    contract.caller = "ST1ADMIN";
    const result = contract.addAllocationRule(1, 40, 30, 30, 50);
    expect(result.ok).toBe(true);
    const rule = contract.state.allocationRules.get(1);
    expect(rule?.weightUrgency).toBe(40);
  });

  it("registers donor score successfully", () => {
    const result = contract.registerDonorScore(1, 90, 8, 45, 70);
    expect(result.ok).toBe(true);
    const score = contract.state.donorScores.get(1);
    expect(score?.compatibilityScore).toBe(90);
  });

  it("registers recipient priority successfully", () => {
    const result = contract.registerRecipientPriority(1, 80, 4, 100);
    expect(result.ok).toBe(true);
    const priority = contract.state.recipientPriorities.get(1);
    expect(priority?.priorityScore).toBe(80);
  });

  it("executes match successfully", () => {
    contract.caller = "ST1ADMIN";
    contract.setOracleContract("ST2ORACLE");
    contract.addAllocationRule(1, 40, 30, 30, 50);
    contract.caller = "ST1TEST";
    contract.registerDonorScore(1, 90, 8, 45, 70);
    contract.registerRecipientPriority(1, 80, 4, 100);
    const result = contract.executeMatch(1, 1, "heart", "O+", 4, 80, 100, 1);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const match = contract.getMatch(0);
    expect(match?.organType).toBe("heart");
    expect(match?.matchScore).toBe(4 * 40 + 100 * 30 + 80 * 30);
    expect(contract.stxTransfers).toEqual([{ amount: 500, from: "ST1TEST", to: "ST2ORACLE" }]);
  });
  
  it("rejects invalid organ type", () => {
    contract.setOracleContract("ST2ORACLE");
    const result = contract.executeMatch(1, 1, "invalid", "O+", 4, 80, 100, 1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_ORGAN_TYPE);
  });

  it("updates match status successfully", () => {
    contract.caller = "ST1ADMIN";
    contract.setOracleContract("ST2ORACLE");
    contract.addAllocationRule(1, 40, 30, 30, 50);
    contract.caller = "ST1TEST";
    contract.registerDonorScore(1, 90, 8, 45, 70);
    contract.registerRecipientPriority(1, 80, 4, 100);
    contract.executeMatch(1, 1, "heart", "O+", 4, 80, 100, 1);
    contract.caller = "ST1ADMIN";
    const result = contract.updateMatchStatus(0, false);
    expect(result.ok).toBe(true);
    const match = contract.getMatch(0);
    expect(match?.status).toBe(false);
  });

  it("rejects update by non-admin", () => {
    const result = contract.updateMatchStatus(0, false);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });
});