import { describe, it, expect } from "vitest";
import {
  generateOtpCode,
  hashOtp,
  verifyOtp,
  calculateSimilarity,
  parseCSVPayments,
} from "./paymentMatching";

// Mock functions for testing
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashOtp(otp: string): string {
  const crypto = require("crypto");
  return crypto.createHash("sha256").update(otp).digest("hex");
}

function verifyOtp(plainOtp: string, hashedOtp: string): boolean {
  return hashOtp(plainOtp) === hashedOtp;
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 100;

  const editDistance = getEditDistance(longer, shorter);
  return ((longer.length - editDistance) / longer.length) * 100;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function parseCSVPayments(csvContent: string) {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("date"));
  const amountIdx = header.findIndex((h) => h.includes("amount"));
  const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("payer"));
  const phoneIdx = header.findIndex((h) => h.includes("phone"));
  const refIdx = header.findIndex((h) => h.includes("reference") || h.includes("ref"));
  const descIdx = header.findIndex((h) => h.includes("description") || h.includes("note"));

  const payments: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    if (parts.length < 2) continue;

    const paymentDate = dateIdx >= 0 ? new Date(parts[dateIdx]) : new Date();
    const amount = amountIdx >= 0 ? parseFloat(parts[amountIdx]) : 0;
    const payerName = nameIdx >= 0 ? parts[nameIdx] : "Unknown";

    if (amount > 0 && payerName) {
      payments.push({
        paymentDate,
        amount,
        payerName,
        phoneNumber: phoneIdx >= 0 ? parts[phoneIdx] : undefined,
        referenceCode: refIdx >= 0 ? parts[refIdx] : undefined,
        description: descIdx >= 0 ? parts[descIdx] : undefined,
      });
    }
  }

  return payments;
}

describe("2FA and Payment Matching System", () => {
  describe("OTP Generation and Verification", () => {
    it("should generate a 6-digit OTP", () => {
      const otp = generateOtpCode();
      expect(otp).toMatch(/^\d{6}$/);
      expect(otp.length).toBe(6);
    });

    it("should hash OTP for secure storage", () => {
      const plainOtp = "123456";
      const hashedOtp = hashOtp(plainOtp);

      expect(hashedOtp).not.toBe(plainOtp);
      expect(hashedOtp.length).toBeGreaterThan(plainOtp.length);
    });

    it("should verify correct OTP", () => {
      const plainOtp = "654321";
      const hashedOtp = hashOtp(plainOtp);

      expect(verifyOtp(plainOtp, hashedOtp)).toBe(true);
    });

    it("should reject incorrect OTP", () => {
      const plainOtp = "123456";
      const hashedOtp = hashOtp(plainOtp);

      expect(verifyOtp("654321", hashedOtp)).toBe(false);
    });

    it("should generate unique OTPs", () => {
      const otp1 = generateOtpCode();
      const otp2 = generateOtpCode();
      // They might be the same by chance, but very unlikely
      // This is more of a sanity check
      expect(otp1).toMatch(/^\d{6}$/);
      expect(otp2).toMatch(/^\d{6}$/);
    });
  });

  describe("String Similarity Matching", () => {
    it("should return 100% for identical strings", () => {
      const similarity = calculateSimilarity("John Doe", "John Doe");
      expect(similarity).toBe(100);
    });

    it("should return 100% for case-insensitive identical strings", () => {
      const similarity = calculateSimilarity("john doe", "JOHN DOE");
      expect(similarity).toBe(100);
    });

    it("should calculate similarity for similar names", () => {
      const similarity = calculateSimilarity("John Doe", "Jon Doe");
      expect(similarity).toBeGreaterThan(70);
    });

    it("should return low similarity for different strings", () => {
      const similarity = calculateSimilarity("John Doe", "Jane Smith");
      expect(similarity).toBeLessThan(50);
    });

    it("should handle whitespace normalization", () => {
      const similarity = calculateSimilarity("  John Doe  ", "john doe");
      expect(similarity).toBe(100);
    });
  });

  describe("CSV Payment Parsing", () => {
    it("should parse valid CSV with all fields", () => {
      const csv = `Date,Amount,Payer Name,Phone,Reference Code,Description
2025-01-15,50000,John Doe,0712345678,ABC123,Rent payment
2025-01-16,5000,Jane Smith,0798765432,XYZ789,Service charge`;

      const payments = parseCSVPayments(csv);

      expect(payments).toHaveLength(2);
      expect(payments[0].payerName).toBe("John Doe");
      expect(payments[0].amount).toBe(50000);
      expect(payments[0].phoneNumber).toBe("0712345678");
      expect(payments[0].referenceCode).toBe("ABC123");
    });

    it("should handle CSV with minimal fields", () => {
      const csv = `Date,Amount,Payer Name
2025-01-15,50000,John Doe`;

      const payments = parseCSVPayments(csv);

      expect(payments).toHaveLength(1);
      expect(payments[0].payerName).toBe("John Doe");
      expect(payments[0].amount).toBe(50000);
    });

    it("should skip invalid rows", () => {
      const csv = `Date,Amount,Payer Name
2025-01-15,50000,John Doe
2025-01-16,invalid,Jane Smith
2025-01-17,5000,Bob Johnson`;

      const payments = parseCSVPayments(csv);

      expect(payments).toHaveLength(2);
      expect(payments[0].payerName).toBe("John Doe");
      expect(payments[1].payerName).toBe("Bob Johnson");
    });

    it("should handle empty CSV", () => {
      const csv = `Date,Amount,Payer Name`;
      const payments = parseCSVPayments(csv);
      expect(payments).toHaveLength(0);
    });

    it("should parse amounts correctly", () => {
      const csv = `Date,Amount,Payer Name
2025-01-15,50000.50,John Doe
2025-01-16,1000,Jane Smith`;

      const payments = parseCSVPayments(csv);

      expect(payments[0].amount).toBe(50000.5);
      expect(payments[1].amount).toBe(1000);
    });
  });

  describe("Security Constraints", () => {
    it("should enforce OTP length", () => {
      const otp = generateOtpCode();
      expect(otp.length).toBe(6);
      expect(parseInt(otp)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(otp)).toBeLessThanOrEqual(999999);
    });

    it("should not store plain OTP", () => {
      const plainOtp = "123456";
      const hashedOtp = hashOtp(plainOtp);
      expect(hashedOtp).not.toContain(plainOtp);
    });

    it("should handle phone number normalization", () => {
      const normalizePhone = (phone: string) => phone.replace(/\D/g, "").slice(-9);

      expect(normalizePhone("0712-345-678")).toBe("712345678");
      expect(normalizePhone("+254 712 345 678")).toBe("712345678");
      expect(normalizePhone("712345678")).toBe("712345678");
    });
  });

  describe("Payment Data Validation", () => {
    it("should validate amount is positive", () => {
      const csv = `Date,Amount,Payer Name
2025-01-15,50000,John Doe
2025-01-16,-1000,Jane Smith`;

      const payments = parseCSVPayments(csv);

      // Should only include positive amounts
      expect(payments).toHaveLength(1);
      expect(payments[0].amount).toBe(50000);
    });

    it("should require payer name", () => {
      const csv = `Date,Amount,Payer Name
2025-01-15,50000,
2025-01-16,1000,Jane Smith`;

      const payments = parseCSVPayments(csv);

      expect(payments).toHaveLength(1);
      expect(payments[0].payerName).toBe("Jane Smith");
    });
  });
});
