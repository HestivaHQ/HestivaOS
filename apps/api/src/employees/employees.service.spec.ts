import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException } from "@nestjs/common";
import { EmployeeStatus, UserStatus } from "@prisma/client";
import { EmployeesService } from "./employees.service";

describe("EmployeesService", () => {
  const businessListOption: any = { findFirst: jest.fn() };
  const employeeRecord: any = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new EmployeesService({
    employeeRecord,
    businessListOption,
  } as never);
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("returns a lean list without emergency contacts, address, or internal notes", async () => {
    employeeRecord.findMany.mockResolvedValue([]);
    await service.list("Ada");
    const select = employeeRecord.findMany.mock.calls[0][0].select;
    expect(select).not.toHaveProperty("emergencyContactName");
    expect(select).not.toHaveProperty("residentialAddress");
    expect(select).not.toHaveProperty("internalNotes");
    expect(select).toMatchObject({
      firstName: true,
      phone: true,
      email: true,
      status: true,
    });
  });

  it("creates an employee without a User or Technician link and keeps optional fields blank", async () => {
    const stored = {
      id: "employee-id",
      employeeReference: "EMP-12",
      firstName: "Ada",
      lastName: "Ndlovu",
      status: EmployeeStatus.ACTIVE,
      user: null,
      technician: null,
    };
    employeeRecord.create.mockResolvedValue(stored);
    employeeRecord.findUnique.mockResolvedValue(stored);
    await expect(
      service.create({
        employeeReference: " EMP-12 ",
        firstName: " Ada ",
        lastName: " Ndlovu ",
      }),
    ).resolves.toMatchObject({ user: null, technician: null });
    expect(employeeRecord.create.mock.calls[0][0].data).toMatchObject({
      employeeReference: "EMP-12",
      firstName: "Ada",
      lastName: "Ndlovu",
    });
  });

  it("rejects unsupported fields and invalid contact email", async () => {
    await expect(
      service.create({
        employeeReference: "EMP-1",
        firstName: "A",
        lastName: "B",
        salary: 100,
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.create({
        employeeReference: "EMP-1",
        firstName: "A",
        lastName: "B",
        email: "not-an-email",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects an end date before the start date", async () => {
    await expect(
      service.create({
        employeeReference: "EMP-1",
        firstName: "A",
        lastName: "B",
        startDate: "2026-08-10",
        endDate: "2026-08-09",
      }),
    ).rejects.toThrow("End date cannot be before start date.");
  });

  it("updates employment status without mutating User status or Technician relationships", async () => {
    const current = {
      id: "employee-id",
      status: EmployeeStatus.ACTIVE,
      user: { status: UserStatus.INACTIVE },
      technician: { id: "tech-id" },
      startDate: null,
      endDate: null,
    };
    employeeRecord.findUnique
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ ...current, status: EmployeeStatus.INACTIVE });
    employeeRecord.update.mockResolvedValue({
      ...current,
      status: EmployeeStatus.INACTIVE,
    });
    await service.update("employee-id", { status: EmployeeStatus.INACTIVE });
    expect(employeeRecord.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ status: EmployeeStatus.INACTIVE }),
    );
    expect(employeeRecord.update.mock.calls[0][0].data).not.toHaveProperty(
      "user",
    );
    expect(employeeRecord.update.mock.calls[0][0].data).not.toHaveProperty(
      "technicianId",
    );
  });

  it("rejects inactive, missing, or wrong-type managed options", async () => {
    businessListOption.findFirst.mockResolvedValue(null);
    await expect(
      service.create({
        employeeReference: "EMP-2",
        firstName: "A",
        lastName: "B",
        jobTitleOptionId: "00000000-0000-0000-0000-000000000001",
      }),
    ).rejects.toThrow("Select an active job title option.");
  });

  it("stores canonical option IDs and labels while personal fields remain free text", async () => {
    businessListOption.findFirst.mockResolvedValue({
      id: "option-id",
      label: "Cleaner",
    });
    const stored = { id: "employee-id" };
    employeeRecord.create.mockResolvedValue(stored);
    employeeRecord.findUnique.mockResolvedValue(stored);
    await service.create({
      employeeReference: "Custom Ref",
      firstName: "Unique",
      lastName: "Person",
      jobTitleOptionId: "option-id",
    });
    expect(employeeRecord.create.mock.calls[0][0].data).toMatchObject({
      employeeReference: "Custom Ref",
      firstName: "Unique",
      jobTitleOptionId: "option-id",
      jobTitle: "Cleaner",
    });
  });

  it("preserves a historical free-text title when no replacement option is submitted", async () => {
    const current = {
      id: "employee-id",
      jobTitle: "Senior Cleaning Lady",
      startDate: null,
      endDate: null,
    };
    employeeRecord.findUnique
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(current);
    employeeRecord.update.mockResolvedValue(current);
    await service.update("employee-id", { phone: "0123" });
    expect(employeeRecord.update.mock.calls[0][0].data).not.toHaveProperty(
      "jobTitle",
    );
  });

  it("retains inactive employees because no delete operation is exposed", () => {
    expect(typeof service.update).toBe("function");
    expect(service).not.toHaveProperty("delete");
  });
});
