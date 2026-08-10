import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { BusinessListType, EmployeeStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";

export type EmployeeInput = {
  employeeReference?: string;
  firstName?: string;
  lastName?: string;
  preferredName?: string | null;
  phone?: string | null;
  email?: string | null;
  residentialAddress?: string | null;
  emergencyContactName?: string | null;
  emergencyRelationship?: string | null;
  emergencyContactPhone?: string | null;
  status?: EmployeeStatus;
  jobTitleOptionId?: string | null;
  departmentOptionId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  internalNotes?: string | null;
  userId?: string | null;
  technicianId?: string | null;
};
const allowed = new Set([
  "employeeReference",
  "firstName",
  "lastName",
  "preferredName",
  "phone",
  "email",
  "residentialAddress",
  "emergencyContactName",
  "emergencyRelationship",
  "emergencyContactPhone",
  "status",
  "jobTitleOptionId",
  "departmentOptionId",
  "startDate",
  "endDate",
  "internalNotes",
  "userId",
  "technicianId",
]);
const userSummary = {
  select: { id: true, role: true, status: true, profilePhotoUrl: true },
} as const;
const technicianSummary = {
  include: {
    crewMembership: {
      include: { crew: { select: { id: true, name: true, status: true } } },
    },
  },
} as const;
@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}
  async list(search?: string, status?: string) {
    if (
      status &&
      !Object.values(EmployeeStatus).includes(status as EmployeeStatus)
    )
      throw new BadRequestException("A valid employment status is required.");
    const term = search?.trim();
    return this.prisma.employeeRecord.findMany({
      where: {
        ...(status ? { status: status as EmployeeStatus } : {}),
        ...(term
          ? {
              OR: [
                { firstName: { contains: term, mode: "insensitive" } },
                { lastName: { contains: term, mode: "insensitive" } },
                { preferredName: { contains: term, mode: "insensitive" } },
                { phone: { contains: term, mode: "insensitive" } },
                { email: { contains: term, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        employeeReference: true,
        firstName: true,
        lastName: true,
        preferredName: true,
        phone: true,
        email: true,
        status: true,
        jobTitle: true,
        department: true,
        user: userSummary,
        technician: technicianSummary,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
  }
  async findOne(id: string) {
    const record = await this.prisma.employeeRecord.findUnique({
      where: { id },
      include: {
        user: userSummary,
        technician: technicianSummary,
        jobTitleOption: true,
        departmentOption: true,
      },
    });
    if (!record) throw new NotFoundException("Employee record not found.");
    return record;
  }
  create(input: EmployeeInput & Record<string, unknown>) {
    return this.save(undefined, input);
  }
  update(id: string, input: EmployeeInput & Record<string, unknown>) {
    return this.save(id, input);
  }
  private async save(
    id: string | undefined,
    input: EmployeeInput & Record<string, unknown>,
  ) {
    const unsupported = Object.keys(input).filter((key) => !allowed.has(key));
    if (unsupported.length)
      throw new BadRequestException(
        `Unsupported employee fields: ${unsupported.join(", ")}.`,
      );
    if (
      !id &&
      (!input.employeeReference?.trim() ||
        !input.firstName?.trim() ||
        !input.lastName?.trim())
    )
      throw new BadRequestException(
        "Employee reference, first name, and last name are required.",
      );
    if (
      input.status !== undefined &&
      !Object.values(EmployeeStatus).includes(input.status)
    )
      throw new BadRequestException("A valid employment status is required.");
    const controlledOption = async (
      optionId: string | null | undefined,
      type: BusinessListType,
    ) => {
      if (optionId === undefined || optionId === null || optionId === "")
        return optionId;
      const option = await this.prisma.businessListOption.findFirst({
        where: { id: optionId, type, isActive: true },
      });
      if (!option)
        throw new BadRequestException(
          `Select an active ${type === BusinessListType.JOB_TITLE ? "job title" : "department"} option.`,
        );
      return option;
    };
    const jobTitleOption = await controlledOption(
      input.jobTitleOptionId,
      BusinessListType.JOB_TITLE,
    );
    const departmentOption = await controlledOption(
      input.departmentOptionId,
      BusinessListType.DEPARTMENT,
    );
    const email = input.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException(
        "A valid employee contact email is required.",
      );
    const date = (value: string | null | undefined, label: string) => {
      if (value === undefined) return undefined;
      if (value === null || value.trim() === "") return null;
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
      )
        throw new BadRequestException(`${label} must be a valid date.`);
      return new Date(`${value}T00:00:00.000Z`);
    };
    const startDate = date(input.startDate, "Start date");
    const endDate = date(input.endDate, "End date");
    const current = id ? await this.findOne(id) : null;
    const effectiveStart =
      startDate === undefined ? current?.startDate : startDate;
    const effectiveEnd = endDate === undefined ? current?.endDate : endDate;
    if (effectiveStart && effectiveEnd && effectiveEnd < effectiveStart)
      throw new BadRequestException("End date cannot be before start date.");
    const nullable = (value: string | null | undefined) =>
      value === undefined ? undefined : value?.trim() || null;
    const data: Prisma.EmployeeRecordUncheckedUpdateInput = {
      ...(input.employeeReference !== undefined
        ? { employeeReference: input.employeeReference.trim() }
        : {}),
      ...(input.firstName !== undefined
        ? { firstName: input.firstName.trim() }
        : {}),
      ...(input.lastName !== undefined
        ? { lastName: input.lastName.trim() }
        : {}),
      preferredName: nullable(input.preferredName),
      phone: nullable(input.phone),
      email: input.email === undefined ? undefined : email,
      residentialAddress: nullable(input.residentialAddress),
      emergencyContactName: nullable(input.emergencyContactName),
      emergencyRelationship: nullable(input.emergencyRelationship),
      emergencyContactPhone: nullable(input.emergencyContactPhone),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(jobTitleOption && typeof jobTitleOption === "object"
        ? {
            jobTitleOptionId: jobTitleOption.id,
            jobTitle: jobTitleOption.label,
          }
        : input.jobTitleOptionId === null
          ? { jobTitleOptionId: null }
          : {}),
      ...(departmentOption && typeof departmentOption === "object"
        ? {
            departmentOptionId: departmentOption.id,
            department: departmentOption.label,
          }
        : input.departmentOptionId === null
          ? { departmentOptionId: null }
          : {}),
      startDate,
      endDate,
      internalNotes: nullable(input.internalNotes),
      ...(input.userId !== undefined ? { userId: input.userId || null } : {}),
      ...(input.technicianId !== undefined
        ? { technicianId: input.technicianId || null }
        : {}),
    };
    try {
      const saved = id
        ? await this.prisma.employeeRecord.update({ where: { id }, data })
        : await this.prisma.employeeRecord.create({
            data: data as Prisma.EmployeeRecordUncheckedCreateInput,
          });
      return this.findOne(saved.id);
    } catch (error) {
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "Employee reference, user, or technician is already linked to another employee record.",
        );
      if (
        typeof error === "object" &&
        error &&
        "code" in error &&
        error.code === "P2025"
      )
        throw new NotFoundException(
          "Employee record or linked record not found.",
        );
      throw error;
    }
  }
}
