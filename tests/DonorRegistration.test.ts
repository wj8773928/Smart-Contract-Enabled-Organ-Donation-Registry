// DonorRegistration.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, buffCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_DONOR_ID = 101;
const ERR_DONOR_ALREADY_EXISTS = 102;
const ERR_INVALID_BLOOD_TYPE = 103;
const ERR_INVALID_ORGAN_TYPE = 104;
const ERR_INVALID_AGE = 105;
const ERR_INVALID_LOCATION = 106;
const ERR_INVALID_CONSENT = 107;
const ERR_INVALID_HEALTH_STATUS = 108;
const ERR_INVALID_WEIGHT = 109;
const ERR_DONOR_NOT_FOUND = 110;
const ERR_INVALID_GENDER = 112;
const ERR_INVALID_CONTACT = 113;
const ERR_INVALID_VERIFICATION = 116;
const ERR_INVALID_HEIGHT = 117;
const ERR_INVALID_BMI = 118;
const ERR_INVALID_REGISTRATION_FEE = 119;

interface Donor {
  principal: string;
  bloodType: string;
  organType: string;
  age: number;
  weight: number;
  height: number;
  bmi: number;
  location: string;
  consentHash: Buffer;
  healthStatus: number;
  gender: string;
  ethnicity: string;
  contact: string;
  timestamp: number;
  verified: boolean;
  active: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class DonorRegistrationMock {
  state: {
    nextDonorId: number;
    registrationFee: number;
    admin: string;
    verifiedOracle: string | null;
    donors: Map<number, Donor>;
    donorByPrincipal: Map<string, number>;
  } = {
    nextDonorId: 0,
    registrationFee: 250,
    admin: "ST1ADMIN",
    verifiedOracle: null,
    donors: new Map(),
    donorByPrincipal: new Map(),
  };
  blockHeight: number = 100;
  caller: string = "ST1USER";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextDonorId: 0,
      registrationFee: 250,
      admin: "ST1ADMIN",
      verifiedOracle: null,
      donors: new Map(),
      donorByPrincipal: new Map(),
    };
    this.blockHeight = 100;
    this.caller = "ST1USER";
    this.stxTransfers = [];
  }

  setVerifiedOracle(oracle: string): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.verifiedOracle = oracle;
    return { ok: true, value: true };
  }

  setRegistrationFee(fee: number): Result<boolean> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registrationFee = fee;
    return { ok: true, value: true };
  }

  registerDonor(
    bloodType: string,
    organType: string,
    age: number,
    weight: number,
    height: number,
    bmi: number,
    location: string,
    consentHash: Buffer,
    healthStatus: number,
    gender: string,
    ethnicity: string,
    contact: string
  ): Result<number> {
    if (!["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].includes(bloodType)) return { ok: false, value: ERR_INVALID_BLOOD_TYPE };
    if (!["heart", "liver", "kidney", "lung", "pancreas", "intestine"].includes(organType)) return { ok: false, value: ERR_INVALID_ORGAN_TYPE };
    if (age < 18 || age > 80) return { ok: false, value: ERR_INVALID_AGE };
    if (weight < 40 || weight > 150) return { ok: false, value: ERR_INVALID_WEIGHT };
    if (height < 140 || height > 220) return { ok: false, value: ERR_INVALID_HEIGHT };
    if (bmi < 15 || bmi > 40) return { ok: false, value: ERR_INVALID_BMI };
    if (location.length === 0) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!consentHash) return { ok: false, value: ERR_INVALID_CONSENT };
    if (healthStatus < 1 || healthStatus > 10) return { ok: false, value: ERR_INVALID_HEALTH_STATUS };
    if (!["male", "female", "other"].includes(gender)) return { ok: false, value: ERR_INVALID_GENDER };
    if (contact.length === 0) return { ok: false, value: ERR_INVALID_CONTACT };
    if (this.state.donorByPrincipal.has(this.caller)) return { ok: false, value: ERR_DONOR_ALREADY_EXISTS };

    this.stxTransfers.push({ amount: this.state.registrationFee, from: this.caller, to: this.state.admin });
    const id = this.state.nextDonorId;
    this.state.donors.set(id, {
      principal: this.caller,
      bloodType,
      organType,
      age,
      weight,
      height,
      bmi,
      location,
      consentHash,
      healthStatus,
      gender,
      ethnicity,
      contact,
      timestamp: this.blockHeight,
      verified: false,
      active: true,
    });
    this.state.donorByPrincipal.set(this.caller, id);
    this.state.nextDonorId++;
    return { ok: true, value: id };
  }

  verifyDonor(donorId: number): Result<boolean> {
    if (!this.state.verifiedOracle) return { ok: false, value: ERR_INVALID_VERIFICATION };
    if (this.caller !== this.state.verifiedOracle) return { ok: false, value: ERR_NOT_AUTHORIZED };
    const donor = this.state.donors.get(donorId);
    if (!donor) return { ok: false, value: ERR_DONOR_NOT_FOUND };
    this.state.donors.set(donorId, { ...donor, verified: true });
    return { ok: true, value: true };
  }

  deactivateDonor(donorId: number): Result<boolean> {
    const donor = this.state.donors.get(donorId);
    if (!donor) return { ok: false, value: ERR_DONOR_NOT_FOUND };
    if (this.caller !== donor.principal && this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.donors.set(donorId, { ...donor, active: false });
    return { ok: true, value: true };
  }

  updateDonorContact(donorId: number, newContact: string): Result<boolean> {
    const donor = this.state.donors.get(donorId);
    if (!donor) return { ok: false, value: ERR_DONOR_NOT_FOUND };
    if (this.caller !== donor.principal) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newContact.length === 0) return { ok: false, value: ERR_INVALID_CONTACT };
    this.state.donors.set(donorId, { ...donor, contact: newContact });
    return { ok: true, value: true };
  }

  getDonorCount(): Result<number> {
    return { ok: true, value: this.state.nextDonorId };
  }

  getDonor(id: number): Donor | null {
    return this.state.donors.get(id) || null;
  }
}

describe("DonorRegistration", () => {
  let contract: DonorRegistrationMock;

  beforeEach(() => {
    contract = new DonorRegistrationMock();
    contract.reset();
  });

  it("registers donor successfully", () => {
    const consent = Buffer.from("consenthash12345678901234567890123");
    const result = contract.registerDonor(
      "O+", "heart", 35, 70, 175, 23, "New York", consent, 8, "male", "Caucasian", "user@example.com"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const donor = contract.getDonor(0);
    expect(donor?.bloodType).toBe("O+");
    expect(donor?.organType).toBe("heart");
    expect(donor?.age).toBe(35);
    expect(donor?.verified).toBe(false);
    expect(contract.stxTransfers).toEqual([{ amount: 250, from: "ST1USER", to: "ST1ADMIN" }]);
  });

  it("rejects duplicate registration", () => {
    const consent = Buffer.from("consenthash12345678901234567890123");
    contract.registerDonor("O+", "heart", 35, 70, 175, 23, "NY", consent, 8, "male", "C", "a@b.c");
    const result = contract.registerDonor("A+", "kidney", 40, 80, 180, 25, "LA", consent, 7, "female", "A", "x@y.z");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_DONOR_ALREADY_EXISTS);
  });

  it("verifies donor by oracle", () => {
    contract.caller = "ST1ADMIN";
    contract.setVerifiedOracle("ST2ORACLE");
    const consent = Buffer.from("consenthash12345678901234567890123");
    contract.caller = "ST1USER";
    contract.registerDonor("O+", "heart", 35, 70, 175, 23, "NY", consent, 8, "male", "C", "a@b.c");
    contract.caller = "ST2ORACLE";
    const result = contract.verifyDonor(0);
    expect(result.ok).toBe(true);
    const donor = contract.getDonor(0);
    expect(donor?.verified).toBe(true);
  });

  it("deactivates donor by user or admin", () => {
    const consent = Buffer.from("consenthash12345678901234567890123");
    contract.registerDonor("O+", "heart", 35, 70, 175, 23, "NY", consent, 8, "male", "C", "a@b.c");
    const result = contract.deactivateDonor(0);
    expect(result.ok).toBe(true);
    const donor = contract.getDonor(0);
    expect(donor?.active).toBe(false);
  });

  it("updates contact info", () => {
    const consent = Buffer.from("consenthash12345678901234567890123");
    contract.registerDonor("O+", "heart", 35, 70, 175, 23, "NY", consent, 8, "male", "C", "old@e.com");
    const result = contract.updateDonorContact(0, "new@e.com");
    expect(result.ok).toBe(true);
    const donor = contract.getDonor(0);
    expect(donor?.contact).toBe("new@e.com");
  });

  it("returns correct donor count", () => {
    const consent = Buffer.from("consenthash12345678901234567890123");
    contract.registerDonor("O+", "heart", 35, 70, 175, 23, "NY", consent, 8, "male", "C", "a@b.c");
    contract.caller = "ST2USER";
    contract.registerDonor("A+", "kidney", 40, 80, 180, 25, "LA", consent, 7, "female", "A", "x@y.z");
    const result = contract.getDonorCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });
});