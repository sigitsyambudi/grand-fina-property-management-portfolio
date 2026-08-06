"use server";

import { revalidatePath } from "next/cache";
import {
  updateRoomConfiguration,
  type RoomUpdateResult,
} from "@/lib/data/room-update";

export async function updateRoomAction(
  roomId: string,
  _previousState: RoomUpdateResult,
  formData: FormData,
): Promise<RoomUpdateResult> {
  const result = await updateRoomConfiguration(roomId, formData);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath("/rooms");
    revalidatePath(`/rooms/${roomId}`);
    revalidatePath("/reports");
    revalidatePath("/settings");
  }

  return result;
}
