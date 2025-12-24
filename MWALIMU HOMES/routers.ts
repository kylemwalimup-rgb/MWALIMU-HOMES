import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Property Management
  properties: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProperties();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPropertyById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createProperty(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateProperty(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteProperty(input.id);
      }),
  }),

  // Unit Management
  units: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllUnits();
    }),
    
    getByPropertyId: protectedProcedure
      .input(z.object({ propertyId: z.number() }))
      .query(async ({ input }) => {
        return await db.getUnitsByPropertyId(input.propertyId);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUnitById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        propertyId: z.number(),
        unitNumber: z.string().min(1),
        unitType: z.enum(["bedsitter", "1BR", "2BR", "shop"]),
        baseRent: z.string(),
        serviceCharge: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createUnit({
          ...input,
          serviceCharge: input.serviceCharge || "0.00",
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        unitNumber: z.string().min(1).optional(),
        unitType: z.enum(["bedsitter", "1BR", "2BR", "shop"]).optional(),
        baseRent: z.string().optional(),
        serviceCharge: z.string().optional(),
        status: z.enum(["vacant", "occupied", "maintenance"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateUnit(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteUnit(input.id);
      }),
  }),

  // Tenant Management
  tenants: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllTenants();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getTenantById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().min(1),
        idNumber: z.string().min(1),
        emergencyContact: z.string().optional(),
        emergencyContactName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createTenant(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(1).optional(),
        idNumber: z.string().min(1).optional(),
        emergencyContact: z.string().optional(),
        emergencyContactName: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateTenant(id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteTenant(input.id);
      }),
  }),

  // Lease Management
  leases: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllLeases();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getLeaseById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        unitId: z.number(),
        startDate: z.date(),
        endDate: z.date().optional(),
        monthlyRent: z.string(),
        serviceCharge: z.string().optional(),
        securityDeposit: z.string(),
        openingBalance: z.string().optional(),
        moveInInspection: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Update unit status to occupied
        await db.updateUnit(input.unitId, { status: "occupied" });
        
        return await db.createLease({
          ...input,
          serviceCharge: input.serviceCharge || "0.00",
          openingBalance: input.openingBalance || "0.00",
        });
      }),
    
    terminate: protectedProcedure
      .input(z.object({
        id: z.number(),
        terminationDate: z.date(),
        terminationNotes: z.string().optional(),
        depositDeduction: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const lease = await db.getLeaseById(input.id);
        if (!lease) throw new Error("Lease not found");
        
        // Update unit status to vacant
        await db.updateUnit(lease.unitId, { status: "vacant" });
        
        return await db.terminateLease(input.id, {
          terminationDate: input.terminationDate,
          terminationNotes: input.terminationNotes,
          depositDeduction: input.depositDeduction || "0.00",
        });
      }),
  }),

  // Invoice Management
  invoices: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllInvoices();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoiceById(input.id);
      }),
    
    getByLeaseId: protectedProcedure
      .input(z.object({ leaseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getInvoicesByLeaseId(input.leaseId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        leaseId: z.number(),
        invoiceNumber: z.string(),
        invoiceDate: z.date(),
        dueDate: z.date(),
        periodStart: z.date(),
        periodEnd: z.date(),
        rentAmount: z.string(),
        serviceChargeAmount: z.string().optional(),
        utilitiesAmount: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const rentAmount = parseFloat(input.rentAmount);
        const serviceChargeAmount = parseFloat(input.serviceChargeAmount || "0");
        const utilitiesAmount = parseFloat(input.utilitiesAmount || "0");
        const totalAmount = (rentAmount + serviceChargeAmount + utilitiesAmount).toFixed(2);
        
        return await db.createInvoice({
          ...input,
          serviceChargeAmount: input.serviceChargeAmount || "0.00",
          utilitiesAmount: input.utilitiesAmount || "0.00",
          totalAmount,
        });
      }),
  }),

  // Payment Management
  payments: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllPayments();
    }),
    
    getByInvoiceId: protectedProcedure
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPaymentsByInvoiceId(input.invoiceId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        invoiceId: z.number(),
        leaseId: z.number(),
        paymentDate: z.date(),
        amount: z.string(),
        paymentMethod: z.enum(["cash", "mpesa", "bank"]),
        transactionReference: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Create payment
        const result = await db.createPayment(input);
        
        // Update invoice status
        const invoice = await db.getInvoiceById(input.invoiceId);
        if (invoice) {
          const payments = await db.getPaymentsByInvoiceId(input.invoiceId);
          const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const totalAmount = parseFloat(invoice.totalAmount);
          
          let status: "unpaid" | "partially_paid" | "fully_paid" | "overdue" = "unpaid";
          if (totalPaid >= totalAmount) {
            status = "fully_paid";
          } else if (totalPaid > 0) {
            status = "partially_paid";
          }
          
          await db.updateInvoice(input.invoiceId, {
            paidAmount: totalPaid.toFixed(2),
            status,
          });
        }
        
        return result;
      }),
  }),

  // Dashboard Statistics
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      return await db.getDashboardStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
