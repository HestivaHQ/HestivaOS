import { describe, expect, it } from "@jest/globals";
import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../users/roles.decorator";
import { BusinessListsController } from "./business-lists.controller";
describe("BusinessListsController authorization", () => {
  it("requires ADMIN for listing and management", () => {
    expect(Reflect.getMetadata(ROLES_KEY, BusinessListsController)).toEqual([
      UserRole.ADMIN,
    ]);
  });
});
