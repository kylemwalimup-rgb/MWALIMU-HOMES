import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-admin",
    email: "admin@test.com",
    name: "Test Admin",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Property Management", () => {
  it("should create a property successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.properties.create({
      name: "Test Property",
      address: "123 Test Street",
      description: "A test property",
    });

    expect(result).toBeDefined();
  });

  it("should list all properties", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const properties = await caller.properties.list();
    expect(Array.isArray(properties)).toBe(true);
  });

  it("should require authentication for property operations", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);

    await expect(caller.properties.list()).rejects.toThrow();
  });
});

describe("Unit Management", () => {
  it("should create a unit for a property", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a property
    await caller.properties.create({
      name: "Test Property for Units",
      address: "456 Test Avenue",
    });

    const properties = await caller.properties.list();
    const propertyId = properties[0]?.id;

    if (propertyId) {
      const result = await caller.units.create({
        propertyId,
        unitNumber: "A101",
        unitType: "1BR",
        baseRent: "10000.00",
        serviceCharge: "500.00",
      });

      expect(result).toBeDefined();
    }
  });

  it("should list units by property ID", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const properties = await caller.properties.list();
    if (properties.length > 0) {
      const units = await caller.units.getByPropertyId({ propertyId: properties[0].id });
      expect(Array.isArray(units)).toBe(true);
    }
  });
});

describe("Tenant Management", () => {
  it("should create a tenant successfully", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.tenants.create({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@test.com",
      phone: "+1234567890",
      idNumber: "ID123456",
      emergencyContact: "+0987654321",
      emergencyContactName: "Jane Doe",
    });

    expect(result).toBeDefined();
  });

  it("should list all tenants", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const tenants = await caller.tenants.list();
    expect(Array.isArray(tenants)).toBe(true);
  });
});

describe("Dashboard Statistics", () => {
  it("should return dashboard statistics", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toBeDefined();
    expect(typeof stats.totalUnits).toBe("number");
    expect(typeof stats.occupiedUnits).toBe("number");
    expect(typeof stats.vacantUnits).toBe("number");
    expect(typeof stats.occupancyRate).toBe("number");
    expect(typeof stats.totalArrears).toBe("number");
  });

  it("should calculate occupancy rate correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    if (stats.totalUnits > 0) {
      const expectedRate = (stats.occupiedUnits / stats.totalUnits) * 100;
      expect(stats.occupancyRate).toBeCloseTo(expectedRate, 2);
    } else {
      expect(stats.occupancyRate).toBe(0);
    }
  });
});
