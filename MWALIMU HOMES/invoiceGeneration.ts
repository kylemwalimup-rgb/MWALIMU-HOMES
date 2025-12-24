import cron from "node-cron";
import { getDb } from "./db";
import { leases, invoices, pendingInvoices, invoiceGenerationLogs } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Generate pending invoices for all active leases
 * This is called by the cron job and creates invoices for review
 */
export async function generateMonthlyInvoices() {
  const db = await getDb();
  if (!db) {
    console.error("[Invoice Generation] Database not available");
    return;
  }

  try {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Get all active leases
    const activeLeases = await db
      .select()
      .from(leases)
      .where(eq(leases.status, "active"));

    if (activeLeases.length === 0) {
      console.log("[Invoice Generation] No active leases found");
      return;
    }

    // Create generation log
    const logEntry = await db.insert(invoiceGenerationLogs).values({
      invoicesGenerated: 0,
      propertiesAffected: 0,
      status: "pending_review",
      details: `Invoice generation for ${now.toLocaleString("default", { month: "long", year: "numeric" })}`,
    });

    const logId = (logEntry as any).insertId || 1;

    // Generate pending invoices for each active lease
    const generatedInvoices: typeof pendingInvoices.$inferInsert[] = [];
    const affectedProperties = new Set<number>();

    for (const lease of activeLeases) {
      const invoiceNumber = `INV-${currentYear}${String(currentMonth + 1).padStart(2, "0")}-${nanoid(6).toUpperCase()}`;
      const periodStart = new Date(currentYear, currentMonth, 1);
      const periodEnd = new Date(currentYear, currentMonth + 1, 0);
      const dueDate = new Date(currentYear, currentMonth + 1, 10); // Due on 10th of next month

      const rentAmount = parseFloat(lease.monthlyRent);
      const serviceChargeAmount = parseFloat(lease.serviceCharge);
      const utilitiesAmount = 0; // Can be customized per lease
      const totalAmount = rentAmount + serviceChargeAmount + utilitiesAmount;

      generatedInvoices.push({
        leaseId: lease.id,
        invoiceNumber,
        invoiceDate: now,
        dueDate,
        periodStart,
        periodEnd,
        rentAmount: rentAmount.toString(),
        serviceChargeAmount: serviceChargeAmount.toString(),
        utilitiesAmount: utilitiesAmount.toString(),
        totalAmount: totalAmount.toString(),
        notes: `Auto-generated invoice for ${periodStart.toLocaleString("default", { month: "long", year: "numeric" })}`,
        generationLogId: logId,
      });

      // Track affected properties (would need to join with units table in real scenario)
      affectedProperties.add(lease.id);
    }

    // Insert pending invoices in batches
    if (generatedInvoices.length > 0) {
      await db.insert(pendingInvoices).values(generatedInvoices);
    }

    // Update generation log
    await db
      .update(invoiceGenerationLogs)
      .set({
        invoicesGenerated: generatedInvoices.length,
        propertiesAffected: affectedProperties.size,
        details: `Successfully generated ${generatedInvoices.length} invoices for review. Status: Pending Admin Review`,
      })
      .where(eq(invoiceGenerationLogs.id, logId));

    console.log(
      `[Invoice Generation] Success: Generated ${generatedInvoices.length} pending invoices for ${affectedProperties.size} properties`
    );

    return {
      success: true,
      invoicesGenerated: generatedInvoices.length,
      propertiesAffected: affectedProperties.size,
      logId,
    };
  } catch (error) {
    console.error("[Invoice Generation] Error:", error);

    // Log failure
    try {
      await db?.insert(invoiceGenerationLogs).values({
        invoicesGenerated: 0,
        propertiesAffected: 0,
        status: "failed",
        details: `Invoice generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } catch (logError) {
      console.error("[Invoice Generation] Failed to log error:", logError);
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Finalize pending invoices - move them to actual invoices table
 */
export async function finalizePendingInvoices(logId: number) {
  const db = await getDb();
  if (!db) {
    console.error("[Invoice Finalization] Database not available");
    return;
  }

  try {
    // Get all pending invoices for this log
    const pending = await db
      .select()
      .from(pendingInvoices)
      .where(eq(pendingInvoices.generationLogId, logId));

    if (pending.length === 0) {
      console.log("[Invoice Finalization] No pending invoices found");
      return;
    }

    // Convert pending invoices to actual invoices
    const invoicesToCreate = pending.map((p) => ({
      leaseId: p.leaseId,
      invoiceNumber: p.invoiceNumber,
      invoiceDate: p.invoiceDate,
      dueDate: p.dueDate,
      periodStart: p.periodStart,
      periodEnd: p.periodEnd,
      rentAmount: p.rentAmount,
      serviceChargeAmount: p.serviceChargeAmount,
      utilitiesAmount: p.utilitiesAmount,
      totalAmount: p.totalAmount,
      paidAmount: "0.00",
      status: "unpaid" as const,
      notes: p.notes,
    }));

    // Insert invoices
    await db.insert(invoices).values(invoicesToCreate);

    // Delete pending invoices
    await db.delete(pendingInvoices).where(eq(pendingInvoices.generationLogId, logId));

    // Update log status
    await db
      .update(invoiceGenerationLogs)
      .set({
        status: "finalized",
        details: `Finalized ${invoicesToCreate.length} invoices. Ready for collection.`,
      })
      .where(eq(invoiceGenerationLogs.id, logId));

    console.log(`[Invoice Finalization] Success: Finalized ${invoicesToCreate.length} invoices`);

    return {
      success: true,
      invoicesFinalized: invoicesToCreate.length,
    };
  } catch (error) {
    console.error("[Invoice Finalization] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Initialize cron job for automatic invoice generation
 * Runs at 00:00 on the 10th of every month
 */
export function initializeInvoiceGenerationCron() {
  // Cron expression: 0 0 10 * * (00:00 on 10th of every month)
  const cronJob = cron.schedule("0 0 10 * *", async () => {
    console.log("[Cron] Running monthly invoice generation job...");
    const result = await generateMonthlyInvoices();
    console.log("[Cron] Invoice generation result:", result);
  });

  console.log("[Cron] Invoice generation job initialized (runs at 00:00 on 10th of each month)");
  return cronJob;
}

/**
 * Manually trigger invoice generation (for testing or admin action)
 */
export async function manuallyTriggerInvoiceGeneration() {
  console.log("[Manual Trigger] Starting manual invoice generation...");
  return await generateMonthlyInvoices();
}
