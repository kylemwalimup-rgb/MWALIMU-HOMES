import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "pending"]).default("pending").notNull(),
  status: mysqlEnum("status", ["active", "inactive", "suspended"]).default("active").notNull(),
  twoFactorEnabled: boolean("twoFactorEnabled").default(true).notNull(),
  twoFactorEmail: varchar("twoFactorEmail", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Properties table - represents rental properties
 */
export const properties = mysqlTable("properties", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Property = typeof properties.$inferSelect;
export type InsertProperty = typeof properties.$inferInsert;

/**
 * Units table - individual rental units within properties
 */
export const units = mysqlTable("units", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: int("propertyId").notNull(),
  unitNumber: varchar("unitNumber", { length: 50 }).notNull(),
  unitType: mysqlEnum("unitType", ["bedsitter", "1BR", "2BR", "shop"]).notNull(),
  baseRent: decimal("baseRent", { precision: 10, scale: 2 }).notNull(),
  serviceCharge: decimal("serviceCharge", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["vacant", "occupied", "maintenance"]).default("vacant").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Unit = typeof units.$inferSelect;
export type InsertUnit = typeof units.$inferInsert;

/**
 * Tenants table - tenant information
 */
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 20 }).notNull(),
  idNumber: varchar("idNumber", { length: 50 }).notNull(),
  emergencyContact: varchar("emergencyContact", { length: 20 }),
  emergencyContactName: varchar("emergencyContactName", { length: 200 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

/**
 * Leases table - rental agreements between tenants and units
 */
export const leases = mysqlTable("leases", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  unitId: int("unitId").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  monthlyRent: decimal("monthlyRent", { precision: 10, scale: 2 }).notNull(),
  serviceCharge: decimal("serviceCharge", { precision: 10, scale: 2 }).default("0.00").notNull(),
  securityDeposit: decimal("securityDeposit", { precision: 10, scale: 2 }).notNull(),
  openingBalance: decimal("openingBalance", { precision: 10, scale: 2 }).default("0.00").notNull(),
  moveInInspection: text("moveInInspection"),
  status: mysqlEnum("status", ["active", "terminated", "expired"]).default("active").notNull(),
  terminationDate: timestamp("terminationDate"),
  terminationNotes: text("terminationNotes"),
  depositDeduction: decimal("depositDeduction", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lease = typeof leases.$inferSelect;
export type InsertLease = typeof leases.$inferInsert;

/**
 * Invoices table - monthly rent invoices
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  leaseId: int("leaseId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  invoiceDate: timestamp("invoiceDate").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  rentAmount: decimal("rentAmount", { precision: 10, scale: 2 }).notNull(),
  serviceChargeAmount: decimal("serviceChargeAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  utilitiesAmount: decimal("utilitiesAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paidAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  status: mysqlEnum("status", ["unpaid", "partially_paid", "fully_paid", "overdue"]).default("unpaid").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Payments table - payment records
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  leaseId: int("leaseId").notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["cash", "mpesa", "bank"]).notNull(),
  transactionReference: varchar("transactionReference", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Invoice Generation Logs table - tracks automated invoice generation events
 */
export const invoiceGenerationLogs = mysqlTable("invoiceGenerationLogs", {
  id: int("id").autoincrement().primaryKey(),
  generationDate: timestamp("generationDate").defaultNow().notNull(),
  invoicesGenerated: int("invoicesGenerated").notNull(),
  propertiesAffected: int("propertiesAffected").notNull(),
  status: mysqlEnum("status", ["pending_review", "finalized", "failed"]).default("pending_review").notNull(),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceGenerationLog = typeof invoiceGenerationLogs.$inferSelect;
export type InsertInvoiceGenerationLog = typeof invoiceGenerationLogs.$inferInsert;

/**
 * Pending Invoices table - holds invoices awaiting admin review and finalization
 */
export const pendingInvoices = mysqlTable("pendingInvoices", {
  id: int("id").autoincrement().primaryKey(),
  leaseId: int("leaseId").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
  invoiceDate: timestamp("invoiceDate").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  periodStart: timestamp("periodStart").notNull(),
  periodEnd: timestamp("periodEnd").notNull(),
  rentAmount: decimal("rentAmount", { precision: 10, scale: 2 }).notNull(),
  serviceChargeAmount: decimal("serviceChargeAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  utilitiesAmount: decimal("utilitiesAmount", { precision: 10, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  generationLogId: int("generationLogId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PendingInvoice = typeof pendingInvoices.$inferSelect;
export type InsertPendingInvoice = typeof pendingInvoices.$inferInsert;


/**
 * OTP (One-Time Password) table for 2FA
 */
export const otpCodes = mysqlTable("otpCodes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 255 }).notNull(),
  attempts: int("attempts").default(0).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OtpCode = typeof otpCodes.$inferSelect;
export type InsertOtpCode = typeof otpCodes.$inferInsert;

/**
 * User Sessions table for device trust
 */
export const userSessions = mysqlTable("userSessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  sessionToken: varchar("sessionToken", { length: 255 }).notNull().unique(),
  deviceFingerprint: varchar("deviceFingerprint", { length: 255 }),
  deviceName: varchar("deviceName", { length: 255 }),
  isTrusted: boolean("isTrusted").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  lastUsedAt: timestamp("lastUsedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = typeof userSessions.$inferInsert;

/**
 * Password Reset Tokens table
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Payment Uploads table - tracks imported payment files
 */
export const paymentUploads = mysqlTable("paymentUploads", {
  id: int("id").autoincrement().primaryKey(),
  uploadedBy: int("uploadedBy").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileType: mysqlEnum("fileType", ["csv", "excel"]).notNull(),
  totalRows: int("totalRows").notNull(),
  matchedCount: int("matchedCount").default(0).notNull(),
  unmatchedCount: int("unmatchedCount").default(0).notNull(),
  status: mysqlEnum("status", ["pending_review", "processed", "failed"]).default("pending_review").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  processedAt: timestamp("processedAt"),
});

export type PaymentUpload = typeof paymentUploads.$inferSelect;
export type InsertPaymentUpload = typeof paymentUploads.$inferInsert;

/**
 * Imported Payments table - individual payment records from uploads
 */
export const importedPayments = mysqlTable("importedPayments", {
  id: int("id").autoincrement().primaryKey(),
  uploadId: int("uploadId").notNull(),
  paymentDate: timestamp("paymentDate").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  payerName: varchar("payerName", { length: 255 }).notNull(),
  phoneNumber: varchar("phoneNumber", { length: 20 }),
  referenceCode: varchar("referenceCode", { length: 100 }),
  description: text("description"),
  tenantId: int("tenantId"),
  invoiceId: int("invoiceId"),
  matchStatus: mysqlEnum("matchStatus", ["matched", "unmatched", "manual"]).default("unmatched").notNull(),
  matchConfidence: int("matchConfidence").default(0),
  isProcessed: boolean("isProcessed").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ImportedPayment = typeof importedPayments.$inferSelect;
export type InsertImportedPayment = typeof importedPayments.$inferInsert;
