import { getDb } from "./db";
import { tenants, importedPayments, paymentUploads } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface ParsedPayment {
  paymentDate: Date;
  amount: number;
  payerName: string;
  phoneNumber?: string;
  referenceCode?: string;
  description?: string;
}

export interface MatchResult {
  tenantId?: number;
  invoiceId?: number;
  matchStatus: "matched" | "unmatched" | "manual";
  matchConfidence: number;
  matchReason?: string;
}

/**
 * Normalize phone number for matching (remove spaces, dashes, etc.)
 */
function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "").slice(-9); // Keep last 9 digits
}

/**
 * Calculate string similarity (Levenshtein distance)
 */
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

/**
 * Calculate edit distance between two strings
 */
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

/**
 * Auto-match payment to tenant
 */
export async function autoMatchPaymentToTenant(payment: ParsedPayment): Promise<MatchResult> {
  const db = await getDb();
  if (!db) {
    return { matchStatus: "unmatched", matchConfidence: 0 };
  }

  try {
    const allTenants = await db.select().from(tenants);

    // Try phone number match first (highest priority)
    if (payment.phoneNumber) {
      const normalizedPhone = normalizePhoneNumber(payment.phoneNumber);
      for (const tenant of allTenants) {
        if (tenant.phone) {
          const tenantPhone = normalizePhoneNumber(tenant.phone);
          if (tenantPhone === normalizedPhone) {
            return {
              tenantId: tenant.id,
              matchStatus: "matched",
              matchConfidence: 100,
              matchReason: "Phone number match",
            };
          }
        }
      }
    }

    // Try name + amount + date proximity match
    const bestMatch = {
      tenant: null as typeof allTenants[0] | null,
      similarity: 0,
      confidence: 0,
    };

    for (const tenant of allTenants) {
      const fullName = `${tenant.firstName} ${tenant.lastName}`.toLowerCase();
      const similarity = calculateSimilarity(payment.payerName, fullName);

      // Require at least 60% name similarity
      if (similarity > 60 && similarity > bestMatch.similarity) {
        bestMatch.tenant = tenant;
        bestMatch.similarity = similarity;
        bestMatch.confidence = Math.round(similarity);
      }
    }

    if (bestMatch.tenant && bestMatch.confidence > 70) {
      return {
        tenantId: bestMatch.tenant.id,
        matchStatus: "matched",
        matchConfidence: bestMatch.confidence,
        matchReason: `Name match (${bestMatch.confidence}% similarity)`,
      };
    }

    return {
      matchStatus: "unmatched",
      matchConfidence: bestMatch.confidence,
      matchReason: "No clear match found",
    };
  } catch (error) {
    console.error("[Payment Matching] Error:", error);
    return { matchStatus: "unmatched", matchConfidence: 0 };
  }
}

/**
 * Parse CSV payment data
 */
export function parseCSVPayments(csvContent: string): ParsedPayment[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const dateIdx = header.findIndex((h) => h.includes("date"));
  const amountIdx = header.findIndex((h) => h.includes("amount"));
  const nameIdx = header.findIndex((h) => h.includes("name") || h.includes("payer"));
  const phoneIdx = header.findIndex((h) => h.includes("phone"));
  const refIdx = header.findIndex((h) => h.includes("reference") || h.includes("ref"));
  const descIdx = header.findIndex((h) => h.includes("description") || h.includes("note"));

  const payments: ParsedPayment[] = [];

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

/**
 * Process uploaded payments and create import records
 */
export async function processPaymentUpload(
  uploadId: number,
  payments: ParsedPayment[]
): Promise<{ success: boolean; matchedCount: number; unmatchedCount: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, matchedCount: 0, unmatchedCount: 0, error: "Database not available" };
  }

  try {
    let matchedCount = 0;
    let unmatchedCount = 0;

    for (const payment of payments) {
      const matchResult = await autoMatchPaymentToTenant(payment);

      await db.insert(importedPayments).values({
        uploadId,
        paymentDate: payment.paymentDate,
        amount: payment.amount.toString(),
        payerName: payment.payerName,
        phoneNumber: payment.phoneNumber,
        referenceCode: payment.referenceCode,
        description: payment.description,
        tenantId: matchResult.tenantId,
        matchStatus: matchResult.matchStatus,
        matchConfidence: matchResult.matchConfidence,
      });

      if (matchResult.matchStatus === "matched") {
        matchedCount++;
      } else {
        unmatchedCount++;
      }
    }

    // Update upload record
    await db
      .update(paymentUploads)
      .set({
        matchedCount,
        unmatchedCount,
      })
      .where(eq(paymentUploads.id, uploadId));

    return { success: true, matchedCount, unmatchedCount };
  } catch (error) {
    console.error("[Payment Upload] Error processing payments:", error);
    return {
      success: false,
      matchedCount: 0,
      unmatchedCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
