import type { ACCESS_ROLES } from "./constants";

export type AccessRole = (typeof ACCESS_ROLES)[number];

export type AuthorizedPropertyAccess = {
  status: "authorized";
  userId: string;
  displayName: string;
  role: AccessRole;
  property: {
    id: string;
    name: string;
    timezone: string;
    currencyCode: string;
  };
};

export type PropertyAccess =
  | AuthorizedPropertyAccess
  | {
      status: "unauthenticated";
    }
  | {
      status: "unauthorized";
      reason:
        | "profile-missing"
        | "membership-missing"
        | "property-unavailable"
        | "role-mismatch"
        | "lookup-failed";
    };

export type WorkspaceIdentity = Pick<
  AuthorizedPropertyAccess,
  "displayName" | "role"
>;
