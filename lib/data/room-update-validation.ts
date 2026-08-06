import type { RoomLocation } from "./types";

export const ROOM_LOCATIONS = [
  "North Wing",
  "South Wing",
] as const satisfies readonly RoomLocation[];

export const MAX_MONTHLY_ROOM_RATE = 1_000_000_000;

export type PortfolioRoomConfiguration = {
  location: RoomLocation;
  floor: 1 | 2;
};

export type RoomUpdateField = "monthlyRate" | "location" | "floor";

export type RoomUpdateValues = {
  monthlyRate: number;
  location: RoomLocation;
  floor: 1 | 2 | null;
};

export type RoomUpdateValidationResult =
  | { ok: true; values: RoomUpdateValues }
  | {
      ok: false;
      code: "invalid-fields" | "unexpected-fields";
      fieldErrors: Partial<Record<RoomUpdateField, string>>;
    };

function isRoomUpdateField(value: string): value is RoomUpdateField {
  return (
    value === "monthlyRate" ||
    value === "location" ||
    value === "floor"
  );
}

function isRoomLocation(value: string): value is RoomLocation {
  return ROOM_LOCATIONS.some((location) => location === value);
}

export function getPortfolioRoomConfiguration(
  roomNumber: string,
): PortfolioRoomConfiguration | null {
  const match = /^([AB])(0[1-9]|1[0-2])$/.exec(roomNumber);
  if (!match) {
    return null;
  }

  const roomSequence = Number(match[2]);
  return {
    location: match[1] === "A" ? "North Wing" : "South Wing",
    floor: roomSequence <= 6 ? 1 : 2,
  };
}

export function isValidPortfolioRoomConfiguration(
  roomNumber: string,
  values: Pick<RoomUpdateValues, "location" | "floor">,
): boolean {
  const expected = getPortfolioRoomConfiguration(roomNumber);
  return (
    expected === null ||
    (values.location === expected.location && values.floor === expected.floor)
  );
}

export function validateRoomUpdateForm(
  formData: FormData,
): RoomUpdateValidationResult {
  const unexpectedField = [...formData.keys()].find(
    (key) => !key.startsWith("$ACTION_") && !isRoomUpdateField(key),
  );

  if (unexpectedField) {
    return {
      ok: false,
      code: "unexpected-fields",
      fieldErrors: {},
    };
  }

  const monthlyRateInput = formData.get("monthlyRate");
  const locationInput = formData.get("location");
  const floorInput = formData.get("floor");
  const fieldErrors: Partial<Record<RoomUpdateField, string>> = {};

  if (
    typeof monthlyRateInput !== "string" ||
    !/^\d+$/.test(monthlyRateInput)
  ) {
    fieldErrors.monthlyRate = "invalid-rate";
  }

  const monthlyRate =
    typeof monthlyRateInput === "string" ? Number(monthlyRateInput) : Number.NaN;

  if (
    !Number.isSafeInteger(monthlyRate) ||
    monthlyRate <= 0 ||
    monthlyRate > MAX_MONTHLY_ROOM_RATE
  ) {
    fieldErrors.monthlyRate = "invalid-rate";
  }

  if (typeof locationInput !== "string" || !isRoomLocation(locationInput)) {
    fieldErrors.location = "invalid-location";
  }

  let floor: 1 | 2 | null = null;
  if (floorInput === "1") {
    floor = 1;
  } else if (floorInput === "2") {
    floor = 2;
  } else if (floorInput !== "") {
    fieldErrors.floor = "invalid-floor";
  }

  if (
    typeof locationInput === "string" &&
    isRoomLocation(locationInput) &&
    floor === null
  ) {
    fieldErrors.floor = "invalid-floor";
  }

  if (
    Object.keys(fieldErrors).length > 0 ||
    typeof locationInput !== "string" ||
    !isRoomLocation(locationInput)
  ) {
    return { ok: false, code: "invalid-fields", fieldErrors };
  }

  return {
    ok: true,
    values: {
      monthlyRate,
      location: locationInput,
      floor,
    },
  };
}
