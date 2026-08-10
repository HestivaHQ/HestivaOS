import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, ConflictException } from "@nestjs/common";
import { BusinessListType } from "@prisma/client";
import { BusinessListsService } from "./business-lists.service";

describe("BusinessListsService", () => {
  const businessListOption: any = {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };
  const service = new BusinessListsService({ businessListOption } as never);
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("lists active options for new selections by default", async () => {
    businessListOption.findMany.mockResolvedValue([]);
    await service.list("JOB_TITLE");
    expect(businessListOption.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type: BusinessListType.JOB_TITLE, isActive: true },
      }),
    );
  });
  it("lets administrators request inactive options for management and historical display", async () => {
    businessListOption.findMany.mockResolvedValue([]);
    await service.list(undefined, true);
    expect(
      businessListOption.findMany.mock.calls[0][0].where,
    ).not.toHaveProperty("isActive");
  });
  it("creates a normalized option", async () => {
    businessListOption.create.mockResolvedValue({ id: "one" });
    await service.create({
      type: BusinessListType.JOB_TITLE,
      label: " Cleaner ",
    });
    expect(businessListOption.create.mock.calls[0][0].data).toMatchObject({
      label: "Cleaner",
      normalizedLabel: "cleaner",
    });
  });
  it("handles duplicate options safely", async () => {
    businessListOption.create.mockRejectedValue({ code: "P2002" });
    await expect(
      service.create({
        type: BusinessListType.DEPARTMENT,
        label: "Operations",
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it("rejects an invalid type", async () => {
    await expect(
      service.create({ type: "OTHER" as never, label: "Other" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it("deactivates without deleting referenced options", async () => {
    businessListOption.update.mockResolvedValue({ id: "one", isActive: false });
    await service.update("one", { isActive: false });
    expect(businessListOption.update).toHaveBeenCalledWith({
      where: { id: "one" },
      data: { isActive: false },
    });
    expect(service).not.toHaveProperty("delete");
  });
});
