import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BusinessListType, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
export type BusinessListInput = {
  type?: BusinessListType;
  label?: string;
  isActive?: boolean;
  sortOrder?: number;
};
@Injectable()
export class BusinessListsService {
  constructor(private readonly prisma: PrismaService) {}
  list(type?: string, includeInactive = false) {
    if (
      type &&
      !Object.values(BusinessListType).includes(type as BusinessListType)
    )
      throw new BadRequestException("A valid business list type is required.");
    return this.prisma.businessListOption.findMany({
      where: {
        ...(type ? { type: type as BusinessListType } : {}),
        ...(!includeInactive ? { isActive: true } : {}),
      },
      orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { label: "asc" }],
    });
  }
  async create(input: BusinessListInput) {
    if (!input.type || !Object.values(BusinessListType).includes(input.type))
      throw new BadRequestException("A valid business list type is required.");
    const label = input.label?.trim();
    if (!label)
      throw new BadRequestException("A business list label is required.");
    try {
      return await this.prisma.businessListOption.create({
        data: {
          type: input.type,
          label,
          normalizedLabel: label.toLocaleLowerCase("en-ZA"),
          sortOrder: input.sortOrder ?? 0,
        },
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "That option already exists in this business list.",
        );
      throw error;
    }
  }
  async update(id: string, input: BusinessListInput) {
    const unsupported = Object.keys(input).filter(
      (key) => !["label", "isActive", "sortOrder"].includes(key),
    );
    if (unsupported.length)
      throw new BadRequestException(
        `Unsupported business list fields: ${unsupported.join(", ")}.`,
      );
    const label = input.label === undefined ? undefined : input.label.trim();
    if (label === "")
      throw new BadRequestException("A business list label is required.");
    const data: Prisma.BusinessListOptionUpdateInput = {
      ...(label !== undefined
        ? { label, normalizedLabel: label.toLocaleLowerCase("en-ZA") }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    };
    try {
      return await this.prisma.businessListOption.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "That option already exists in this business list.",
        );
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2025"
      )
        throw new NotFoundException("Business list option not found.");
      throw error;
    }
  }
}
