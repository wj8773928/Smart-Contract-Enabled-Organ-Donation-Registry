// RecipientRegistration.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { stringAsciiCV, buffCV, uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_RECIPIENT_ID = 101;
const ERR_RECIPIENT_ALREADY_EXISTS = 102;
const ERR_INVALID_BLOOD_TYPE = 103;
const ERR_INVALID_ORGAN_NEEDED = 104;
const ERR_INVALID_URGENCY = 105;
const ERR_INVALID_WAIT_TIME = 106;
const ERR_INVALID_LOCATION = 107;
const ERR_INVALID_DIAGNOSIS = 108;
const ERR_INVALID_AGE = 109;
const ERR_INVALID_HEIGHT = 110;
const ERR_INVALID_WEIGHT = 111;
const ERR_INVALID_BMI = 112;
const ERR_INVALID_CONTACT = 113;
const ERR_INVALID_GENDER = 115;
const ERR_INVALID_VERIFICATION = 116;
const ERR_INVALID_REGISTRATION_FEE = 117;
const ERR_INVALID_MEDICAL_HISTORY = 118;
const ERR_RECIPIENT_NOT_FOUND = 119;

interface Recipient {
  principal: string;
  bloodType: string;
  organNeeded: string;
  urgencyLevel: number;
  waitDays: number;
  age: number;
  height: number;
  weight: number;
  bmi: number;
  location: string;
  diagnosis: string;
  medicalHistoryHash: Buffer;
  contact: string;
  gender: string;
  ethnicity: string;
  timestamp: number;
  verified: boolean;
  active: boolean;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class RecipientRegistrationMock {
  state: {
    nextRecipientId: number;
    registrationFee: number;
    admin: string;
    verifiedOracle: string | null;
    recipients: Map<number, Recipient>;
    recipientByPrincipal: Map<string, number>;
  } = {
    nextRecipientId: 0,
    registrationFee: 300,
    admin: "ST1ADMIN",
    verifiedOracle: null,
    recipients: new Map(),
    recipientByPrincipal: new Map(),
  };
  blockHeight: number = 200;
  caller: string = "ST1PATIENT";
  stxTransfers: Array<{ amount: number; from: string; to: string }> = [];

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextRecipientId: 0,
      registrationFee: 300,
      admin: "ST1ADMIN",
      verifiedOracle: null,
      recipients: new Map(),
      recipientByPrincipal: new Map(),
    };
    this.blockHeight = 200;
    this.caller = "ST1PATIENT";
    this.stxTransfers = [];
  }

  setVerifiedOracle(oracle: string): Result<boolean> {
    if (this.caller !== this.state.admin)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.verifiedOracle = oracle;
    return { ok: true, value: true };
  }

  setRegistrationFee(fee: number): Result<boolean> {
    if (this.caller !== this.state.admin)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registrationFee = fee;
    return { ok: true, value: true };
  }

  registerRecipient(
    bloodType: string,
    organNeeded: string,
    urgencyLevel: number,
    waitDays: number,
    age: number,
    height: number,
    weight: number,
    bmi: number,
    location: string,
    diagnosis: string,
    medicalHistoryHash: Buffer,
    contact: string,
    gender: string,
    ethnicity: string
  ): Result<number> {
    if (!["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].includes(bloodType))
      return { ok: false, value: ERR_INVALID_BLOOD_TYPE };
    if (
      !["heart", "liver", "kidney", "lung", "pancreas", "intestine"].includes(
        organNeeded
      )
    )
      return { ok: false, value: ERR_INVALID_ORGAN_NEEDED };
    if (urgencyLevel < 1 || urgencyLevel > 5)
      return { ok: false, value: ERR_INVALID_URGENCY };
    if (waitDays > 3650) return { ok: false, value: ERR_INVALID_WAIT_TIME };
    if (age > 100) return { ok: false, value: ERR_INVALID_AGE };
    if (height < 50 || height > 220)
      return { ok: false, value: ERR_INVALID_HEIGHT };
    if (weight < 10 || weight > 200)
      return { ok: false, value: ERR_INVALID_WEIGHT };
    if (bmi < 10 || bmi > 50) return { ok: false, value: ERR_INVALID_BMI };
    if (location.length === 0)
      return { ok: false, value: ERR_INVALID_LOCATION };
    if (diagnosis.length === 0)
      return { ok: false, value: ERR_INVALID_DIAGNOSIS };
    if (!medicalHistoryHash)
      return { ok: false, value: ERR_INVALID_MEDICAL_HISTORY };
    if (contact.length === 0) return { ok: false, value: ERR_INVALID_CONTACT };
    if (!["male", "female", "other"].includes(gender))
      return { ok: false, value: ERR_INVALID_GENDER };
    if (this.state.recipientByPrincipal.has(this.caller))
      return { ok: false, value: ERR_RECIPIENT_ALREADY_EXISTS };

    this.stxTransfers.push({
      amount: this.state.registrationFee,
      from: this.caller,
      to: this.state.admin,
    });
    const id = this.state.nextRecipientId;
    this.state.recipients.set(id, {
      principal: this.caller,
      bloodType,
      organNeeded,
      urgencyLevel,
      waitDays,
      age,
      height,
      weight,
      bmi,
      location,
      diagnosis,
      medicalHistoryHash,
      contact,
      gender,
      ethnicity,
      timestamp: this.blockHeight,
      verified: false,
      active: true,
    });
    this.state.recipientByPrincipal.set(this.caller, id);
    this.state.nextRecipientId++;
    return { ok: true, value: id };
  }

  verifyRecipient(recipientId: number): Result<boolean> {
    if (!this.state.verifiedOracle)
      return { ok: false, value: ERR_INVALID_VERIFICATION };
    if (this.caller !== this.state.verifiedOracle)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    const recipient = this.state.recipients.get(recipientId);
    if (!recipient) return { ok: false, value: ERR_RECIPIENT_NOT_FOUND };
    this.state.recipients.set(recipientId, { ...recipient, verified: true });
    return { ok: true, value: true };
  }

  deactivateRecipient(recipientId: number): Result<boolean> {
    const recipient = this.state.recipients.get(recipientId);
    if (!recipient) return { ok: false, value: ERR_RECIPIENT_NOT_FOUND };
    if (this.caller !== recipient.principal && this.caller !== this.state.admin)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.recipients.set(recipientId, { ...recipient, active: false });
    return { ok: true, value: true };
  }

  updateRecipientContact(
    recipientId: number,
    newContact: string
  ): Result<boolean> {
    const recipient = this.state.recipients.get(recipientId);
    if (!recipient) return { ok: false, value: ERR_RECIPIENT_NOT_FOUND };
    if (this.caller !== recipient.principal)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newContact.length === 0)
      return { ok: false, value: ERR_INVALID_CONTACT };
    this.state.recipients.set(recipientId, {
      ...recipient,
      contact: newContact,
    });
    return { ok: true, value: true };
  }

  updateWaitDays(recipientId: number, newWaitDays: number): Result<boolean> {
    const recipient = this.state.recipients.get(recipientId);
    if (!recipient) return { ok: false, value: ERR_RECIPIENT_NOT_FOUND };
    if (this.caller !== recipient.principal)
      return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newWaitDays > 3650) return { ok: false, value: ERR_INVALID_WAIT_TIME };
    this.state.recipients.set(recipientId, {
      ...recipient,
      waitDays: newWaitDays,
    });
    return { ok: true, value: true };
  }

  getRecipientCount(): Result<number> {
    return { ok: true, value: this.state.nextRecipientId };
  }

  getRecipient(id: number): Recipient | null {
    return this.state.recipients.get(id) || null;
  }
}

describe("RecipientRegistration", () => {
  let contract: RecipientRegistrationMock;

  beforeEach(() => {
    contract = new RecipientRegistrationMock();
    contract.reset();
  });

  it("registers recipient successfully", () => {
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    const result = contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "End-stage renal disease",
      hash,
      "patient@hospital.com",
      "female",
      "Hispanic"
    );
    expect(result.ok).toBe(true);
    expect(result.value).toBe(0);
    const recipient = contract.getRecipient(0);
    expect(recipient?.bloodType).toBe("A+");
    expect(recipient?.organNeeded).toBe("kidney");
    expect(recipient?.urgencyLevel).toBe(3);
    expect(recipient?.waitDays).toBe(180);
    expect(recipient?.verified).toBe(false);
    expect(contract.stxTransfers).toEqual([
      { amount: 300, from: "ST1PATIENT", to: "ST1ADMIN" },
    ]);
  });

  it("rejects duplicate registration", () => {
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "ESRD",
      hash,
      "a@b.c",
      "female",
      "H"
    );
    const result = contract.registerRecipient(
      "B+",
      "liver",
      4,
      90,
      40,
      170,
      70,
      24,
      "NY",
      "Cirrhosis",
      hash,
      "x@y.z",
      "male",
      "A"
    );
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_RECIPIENT_ALREADY_EXISTS);
  });

  it("verifies recipient by oracle", () => {
    contract.caller = "ST1ADMIN";
    contract.setVerifiedOracle("ST2ORACLE");
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    contract.caller = "ST1PATIENT";
    contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "ESRD",
      hash,
      "a@b.c",
      "female",
      "H"
    );
    contract.caller = "ST2ORACLE";
    const result = contract.verifyRecipient(0);
    expect(result.ok).toBe(true);
    const recipient = contract.getRecipient(0);
    expect(recipient?.verified).toBe(true);
  });

  it("updates wait days and contact", () => {
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "ESRD",
      hash,
      "old@e.com",
      "female",
      "H"
    );
    contract.updateWaitDays(0, 200);
    contract.updateRecipientContact(0, "new@e.com");
    const recipient = contract.getRecipient(0);
    expect(recipient?.waitDays).toBe(200);
    expect(recipient?.contact).toBe("new@e.com");
  });

  it("deactivates recipient by user or admin", () => {
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "ESRD",
      hash,
      "a@b.c",
      "female",
      "H"
    );
    const result = contract.deactivateRecipient(0);
    expect(result.ok).toBe(true);
    const recipient = contract.getRecipient(0);
    expect(recipient?.active).toBe(false);
  });

  it("returns correct recipient count", () => {
    const hash = Buffer.from("medhistoryhash123456789012345678901");
    contract.registerRecipient(
      "A+",
      "kidney",
      3,
      180,
      55,
      165,
      60,
      22,
      "Boston",
      "ESRD",
      hash,
      "a@b.c",
      "female",
      "H"
    );
    contract.caller = "ST2PATIENT";
    contract.registerRecipient(
      "O-",
      "heart",
      5,
      30,
      30,
      160,
      55,
      21,
      "LA",
      "Cardiomyopathy",
      hash,
      "x@y.z",
      "male",
      "A"
    );
    const result = contract.getRecipientCount();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(2);
  });
});
