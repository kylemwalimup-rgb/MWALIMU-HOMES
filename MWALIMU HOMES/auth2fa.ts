import { getDb } from "./db";
import { otpCodes, users } from "../drizzle/schema";
import { eq, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import crypto from "crypto";

const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LENGTH = 6;

/**
 * Generate a 6-digit OTP code
 */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash OTP for secure storage (never store plain text)
 */
function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Verify OTP against hashed version
 */
function verifyOtp(plainOtp: string, hashedOtp: string): boolean {
  return hashOtp(plainOtp) === hashedOtp;
}

/**
 * Generate and send OTP to user email
 */
export async function generateAndSendOtp(userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get user
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user || user.length === 0) {
      return { success: false, error: "User not found" };
    }

    const userData = user[0];
    const otpEmail = userData.twoFactorEmail || userData.email;

    if (!otpEmail) {
      return { success: false, error: "No email configured for 2FA" };
    }

    // Generate OTP
    const plainOtp = generateOtpCode();
    const hashedOtp = hashOtp(plainOtp);

    // Delete any existing unexpired OTPs for this user
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));

    // Create new OTP record
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await db.insert(otpCodes).values({
      userId,
      code: hashedOtp,
      attempts: 0,
      expiresAt,
    });

    // TODO: Send email with OTP
    // For now, log to console (in production, use email service like SendGrid, AWS SES, etc.)
    console.log(`[2FA] OTP for user ${userId}: ${plainOtp} (expires at ${expiresAt.toISOString()})`);
    console.log(`[2FA] Email would be sent to: ${otpEmail}`);

    return { success: true };
  } catch (error) {
    console.error("[2FA] Error generating OTP:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOtpCode(userId: number, plainOtp: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    // Get unexpired OTP for user
    const otpRecord = await db
      .select()
      .from(otpCodes)
      .where(eq(otpCodes.userId, userId))
      .limit(1);

    if (!otpRecord || otpRecord.length === 0) {
      return { success: false, error: "No OTP found. Please request a new one." };
    }

    const otp = otpRecord[0];

    // Check if OTP has expired
    if (new Date() > otp.expiresAt) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
      return { success: false, error: "OTP has expired. Please request a new one." };
    }

    // Check attempt limit
    if (otp.attempts >= MAX_OTP_ATTEMPTS) {
      await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
      return { success: false, error: "Maximum OTP attempts exceeded. Please request a new one." };
    }

    // Verify OTP
    if (!verifyOtp(plainOtp, otp.code)) {
      // Increment attempts
      await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
      const remainingAttempts = MAX_OTP_ATTEMPTS - (otp.attempts + 1);
      return {
        success: false,
        error: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
      };
    }

    // Mark OTP as used
    await db.update(otpCodes).set({ usedAt: new Date() }).where(eq(otpCodes.id, otp.id));

    return { success: true };
  } catch (error) {
    console.error("[2FA] Error verifying OTP:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Check if user has 2FA enabled
 */
export async function isTwoFactorEnabled(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    return user.length > 0 && user[0].twoFactorEnabled === true;
  } catch (error) {
    console.error("[2FA] Error checking 2FA status:", error);
    return false;
  }
}

/**
 * Enable 2FA for user
 */
export async function enable2FA(userId: number, email: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db.update(users).set({ twoFactorEnabled: true, twoFactorEmail: email }).where(eq(users.id, userId));
    return { success: true };
  } catch (error) {
    console.error("[2FA] Error enabling 2FA:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Disable 2FA for user
 */
export async function disable2FA(userId: number): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  try {
    await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, userId));
    // Clean up any pending OTPs
    await db.delete(otpCodes).where(eq(otpCodes.userId, userId));
    return { success: true };
  } catch (error) {
    console.error("[2FA] Error disabling 2FA:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanupExpiredOtps(): Promise<{ cleaned: number; error?: string }> {
  const db = await getDb();
  if (!db) {
    return { cleaned: 0, error: "Database not available" };
  }

  try {
    await db.delete(otpCodes).where(lt(otpCodes.expiresAt, new Date()));
    return { cleaned: 1 }; // Simplified for now
  } catch (error) {
    console.error("[2FA] Error cleaning up OTPs:", error);
    return { cleaned: 0, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
