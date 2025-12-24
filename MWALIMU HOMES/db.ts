import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  properties, InsertProperty,
  units, InsertUnit,
  tenants, InsertTenant,
  leases, InsertLease,
  invoices, InsertInvoice,
  payments, InsertPayment
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER OPERATIONS =============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.email) {
    throw new Error("User email is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      email: user.email,
      openId: user.openId || undefined,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= PROPERTY OPERATIONS =============
export async function createProperty(property: InsertProperty) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(properties).values(property);
  return result;
}

export async function getAllProperties() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(properties).orderBy(desc(properties.createdAt));
}

export async function getPropertyById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
  return result[0];
}

export async function updateProperty(id: number, data: Partial<InsertProperty>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(properties).set(data).where(eq(properties.id, id));
}

export async function deleteProperty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(properties).where(eq(properties.id, id));
}

// ============= UNIT OPERATIONS =============
export async function createUnit(unit: InsertUnit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(units).values(unit);
}

export async function getUnitsByPropertyId(propertyId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(units).where(eq(units.propertyId, propertyId));
}

export async function getUnitById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(units).where(eq(units.id, id)).limit(1);
  return result[0];
}

export async function updateUnit(id: number, data: Partial<InsertUnit>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(units).set(data).where(eq(units.id, id));
}

export async function deleteUnit(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(units).where(eq(units.id, id));
}

export async function getAllUnits() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(units).orderBy(units.propertyId, units.unitNumber);
}

// ============= TENANT OPERATIONS =============
export async function createTenant(tenant: InsertTenant) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(tenants).values(tenant);
}

export async function getAllTenants() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(tenants).orderBy(desc(tenants.createdAt));
}

export async function getTenantById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  return result[0];
}

export async function updateTenant(id: number, data: Partial<InsertTenant>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(tenants).set(data).where(eq(tenants.id, id));
}

export async function deleteTenant(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.delete(tenants).where(eq(tenants.id, id));
}

// ============= LEASE OPERATIONS =============
export async function createLease(lease: InsertLease) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(leases).values(lease);
}

export async function getAllLeases() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(leases).orderBy(desc(leases.createdAt));
}

export async function getActiveLeases() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(leases).where(eq(leases.status, "active"));
}

export async function getLeaseById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leases).where(eq(leases.id, id)).limit(1);
  return result[0];
}

export async function getLeaseByUnitId(unitId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(leases)
    .where(and(eq(leases.unitId, unitId), eq(leases.status, "active")))
    .limit(1);
  return result[0];
}

export async function updateLease(id: number, data: Partial<InsertLease>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(leases).set(data).where(eq(leases.id, id));
}

export async function terminateLease(id: number, terminationData: {
  terminationDate: Date;
  terminationNotes?: string;
  depositDeduction?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(leases).set({
    status: "terminated",
    ...terminationData
  }).where(eq(leases.id, id));
}

// ============= INVOICE OPERATIONS =============
export async function createInvoice(invoice: InsertInvoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(invoices).values(invoice);
}

export async function getAllInvoices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(invoices).orderBy(desc(invoices.invoiceDate));
}

export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  return result[0];
}

export async function getInvoicesByLeaseId(leaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(invoices)
    .where(eq(invoices.leaseId, leaseId))
    .orderBy(desc(invoices.invoiceDate));
}

export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.update(invoices).set(data).where(eq(invoices.id, id));
}

export async function getUnpaidInvoices() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(invoices)
    .where(sql`${invoices.status} IN ('unpaid', 'partially_paid', 'overdue')`);
}

// ============= PAYMENT OPERATIONS =============
export async function createPayment(payment: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.insert(payments).values(payment);
}

export async function getAllPayments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(payments).orderBy(desc(payments.paymentDate));
}

export async function getPaymentsByInvoiceId(invoiceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(payments).where(eq(payments.invoiceId, invoiceId));
}

export async function getPaymentsByLeaseId(leaseId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select().from(payments)
    .where(eq(payments.leaseId, leaseId))
    .orderBy(desc(payments.paymentDate));
}

// ============= DASHBOARD STATISTICS =============
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get total units
  const totalUnitsResult = await db.select({ count: sql<number>`count(*)` }).from(units);
  const totalUnits = totalUnitsResult[0]?.count || 0;
  
  // Get occupied units
  const occupiedUnitsResult = await db.select({ count: sql<number>`count(*)` })
    .from(units)
    .where(eq(units.status, "occupied"));
  const occupiedUnits = occupiedUnitsResult[0]?.count || 0;
  
  // Get total arrears (unpaid + partially paid invoices)
  const arrearsResult = await db.select({ 
    total: sql<string>`SUM(${invoices.totalAmount} - ${invoices.paidAmount})` 
  })
    .from(invoices)
    .where(sql`${invoices.status} IN ('unpaid', 'partially_paid', 'overdue')`);
  
  const totalArrears = parseFloat(arrearsResult[0]?.total || "0");
  
  // Calculate occupancy rate
  const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  
  return {
    totalUnits,
    occupiedUnits,
    vacantUnits: totalUnits - occupiedUnits,
    occupancyRate: Math.round(occupancyRate * 100) / 100,
    totalArrears
  };
}
