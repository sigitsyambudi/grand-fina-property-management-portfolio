"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useLocalization } from "@/components/localization/localization-provider";
import { formatDisplayValue } from "@/lib/i18n/display-values";
import { formatIdr } from "@/components/rooms/room-formatters";
import type { Room } from "@/lib/data/types";
import type {
  RoomUpdateField,
} from "@/lib/data/room-update-validation";
import {
  getPortfolioRoomConfiguration,
  ROOM_LOCATIONS,
} from "@/lib/data/room-update-validation";
import type { RoomUpdateResult } from "@/lib/data/room-update";
import { updateRoomAction } from "@/app/(workspace)/rooms/[id]/actions";

const INITIAL_STATE: RoomUpdateResult = { status: "idle" };

function SaveButton() {
  const { pending } = useFormStatus();
  const { t } = useLocalization();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-md bg-[var(--brand)] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#123c31] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? t("rooms.saving") : t("rooms.saveChanges")}
    </button>
  );
}

function fieldErrorKey(field: RoomUpdateField) {
  const keys = {
    monthlyRate: "rooms.invalidRate",
    location: "rooms.invalidLocation",
    floor: "rooms.invalidFloor",
  } as const;

  return keys[field];
}

export function RoomEditPanel({
  room,
  canEdit,
}: {
  room: Room;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { locale, t } = useLocalization();
  const portfolioConfiguration = getPortfolioRoomConfiguration(room.roomNumber);
  const allowedLocations = portfolioConfiguration
    ? [portfolioConfiguration.location]
    : ROOM_LOCATIONS;
  const allowedFloors = portfolioConfiguration
    ? [portfolioConfiguration.floor]
    : [1, 2];
  const initialLocation = portfolioConfiguration?.location ?? room.location;
  const initialFloor = (
    portfolioConfiguration?.floor ?? room.floor
  )?.toString() ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [location, setLocation] = useState(initialLocation);
  const [floor, setFloor] = useState(initialFloor);
  const action = updateRoomAction.bind(null, room.id);
  const [state, formAction] = useActionState(action, INITIAL_STATE);

  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [router, state.status]);

  if (!canEdit) {
    return (
      <p className="text-xs text-[var(--muted)]">
        {t("rooms.staffReadOnly")}
      </p>
    );
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--brand)] px-4 text-xs font-semibold text-[var(--brand)] hover:bg-[#f0f5f2]"
      >
        {t("rooms.editConfiguration")}
      </button>
    );
  }

  const fieldErrors =
    state.status === "error" && state.fieldErrors ? state.fieldErrors : {};

  return (
    <form
      action={formAction}
      className="border border-[var(--border)] bg-white p-5 sm:p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="text-sm font-semibold">{t("rooms.editConfiguration")}</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            {t("rooms.editDescription")}
          </p>
        </div>
        <span className="text-xs font-medium text-[var(--muted)]">
          {t("rooms.statusReadOnly")}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block text-xs font-semibold">
          {t("common.monthlyRate")}
          <input
            name="monthlyRate"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            defaultValue={room.monthlyRate}
            aria-invalid={Boolean(fieldErrors.monthlyRate)}
            className="mt-2 min-h-11 w-full rounded-md border border-[var(--border)] px-3 text-sm font-medium outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de]"
          />
          <span className="mt-1 block text-[11px] font-normal text-[var(--muted)]">
            {t("rooms.currentRate", { amount: formatIdr(room.monthlyRate) })}
          </span>
          {fieldErrors.monthlyRate ? (
            <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
              {t(fieldErrorKey("monthlyRate"))}
            </span>
          ) : null}
        </label>

        <label className="block text-xs font-semibold">
          {t("common.location")}
          <select
            name="location"
            value={location}
            onChange={(event) => {
              const nextLocation = ROOM_LOCATIONS.find(
                (candidate) => candidate === event.target.value,
              );
              if (!nextLocation) {
                return;
              }
              setLocation(nextLocation);
              setFloor(
                (portfolioConfiguration?.floor.toString() ?? floor) || "1",
              );
            }}
            aria-invalid={Boolean(fieldErrors.location)}
            className="mt-2 min-h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de]"
          >
            {allowedLocations.map((roomLocation) => (
              <option key={roomLocation} value={roomLocation}>
                {formatDisplayValue(roomLocation, locale)}
              </option>
            ))}
          </select>
          {fieldErrors.location ? (
            <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
              {t(fieldErrorKey("location"))}
            </span>
          ) : null}
        </label>

        <label className="block text-xs font-semibold">
          {t("common.floor")}
          <select
            name="floor"
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
            aria-invalid={Boolean(fieldErrors.floor)}
            className="mt-2 min-h-11 w-full rounded-md border border-[var(--border)] bg-white px-3 text-sm font-medium outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[#d7e5de]"
          >
            {allowedFloors.map((roomFloor) => (
              <option key={roomFloor} value={roomFloor}>
                {t("common.floorNumber", { floor: roomFloor })}
              </option>
            ))}
          </select>
          {fieldErrors.floor ? (
            <span role="alert" className="mt-1 block text-xs font-medium text-[#9b2c2c]">
              {t(fieldErrorKey("floor"))}
            </span>
          ) : null}
        </label>
      </div>

      {state.status === "success" ? (
        <p className="mt-4 text-xs font-semibold text-[var(--brand)]" role="status">
          {t("rooms.updateSuccess")}
        </p>
      ) : null}
      {state.status === "error" && state.code !== "invalid-fields" ? (
        <p className="mt-4 text-xs font-semibold text-[#9b2c2c]" role="alert">
          {t(
            state.code === "not-authorized"
              ? "rooms.updateUnauthorized"
              : state.code === "not-found"
                ? "rooms.updateNotFound"
                : state.code === "invalid-request" ||
                    state.code === "unexpected-fields"
                  ? "rooms.invalidRequest"
                  : "rooms.updateFailed",
          )}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <SaveButton />
        <button
          type="button"
          onClick={() => {
            setIsEditing(false);
            setLocation(initialLocation);
            setFloor(initialFloor);
          }}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-xs font-semibold hover:bg-[#f6f4ef]"
        >
          {t("rooms.cancelEdit")}
        </button>
      </div>
    </form>
  );
}
