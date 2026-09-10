import { prisma, getCurrentUser } from "@/lib/db";
import { handler, jsonError, jsonOk, readJson } from "@/lib/api";
import { clamp, parseList, stringifyList } from "@/lib/utils";
import { EQUIPMENT, WORKOUT_STYLES } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await getCurrentUser();
  return jsonOk({
    name: user.name,
    interests: parseList(user.profile?.interests),
    preferredStyles: parseList(user.profile?.preferredStyles),
    equipment: parseList(user.profile?.equipment),
    sessionMinutes: user.profile?.sessionMinutes ?? 40,
    daysPerWeek: user.profile?.daysPerWeek ?? 4,
    experience: user.profile?.experience ?? "beginner",
    notifyWorkoutReminders: user.profile?.notifyWorkoutReminders ?? true,
    notifyMealReminders: user.profile?.notifyMealReminders ?? false,
    storePhotos: user.profile?.storePhotos ?? false,
    shareAnonymousStats: user.profile?.shareAnonymousStats ?? false,
  });
});

interface Body {
  name?: string;
  interests?: string[];
  preferredStyles?: string[];
  equipment?: string[];
  sessionMinutes?: number;
  daysPerWeek?: number;
  experience?: string;
  notifyWorkoutReminders?: boolean;
  notifyMealReminders?: boolean;
  storePhotos?: boolean;
  shareAnonymousStats?: boolean;
}

const EXPERIENCE = new Set(["beginner", "intermediate", "advanced"]);

export const PUT = handler(async (request: Request) => {
  const body = await readJson<Body>(request);
  if (!body) return jsonError({ code: "invalid_input", message: "That request couldn't be read." });

  const user = await getCurrentUser();
  const name = body.name?.trim();
  if (name !== undefined && name.length === 0) {
    return jsonError({ code: "invalid_input", message: "Your name can't be empty." });
  }

  // Whitelist the enum-ish fields so bad input can't poison the recommender.
  const styles = (body.preferredStyles ?? []).filter((s) => (WORKOUT_STYLES as readonly string[]).includes(s));
  const equipment = (body.equipment ?? []).filter((e) => (EQUIPMENT as readonly string[]).includes(e));

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: name ? { name } : {} }),
    prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        interests: stringifyList(body.interests ?? []),
        preferredStyles: stringifyList(styles),
        equipment: stringifyList(equipment),
      },
      update: {
        ...(body.interests ? { interests: stringifyList(body.interests.slice(0, 12).map((i) => i.slice(0, 40))) } : {}),
        ...(body.preferredStyles ? { preferredStyles: stringifyList(styles) } : {}),
        ...(body.equipment ? { equipment: stringifyList(equipment) } : {}),
        ...(body.sessionMinutes ? { sessionMinutes: clamp(Math.round(body.sessionMinutes), 10, 120) } : {}),
        ...(body.daysPerWeek ? { daysPerWeek: clamp(Math.round(body.daysPerWeek), 1, 7) } : {}),
        ...(body.experience && EXPERIENCE.has(body.experience) ? { experience: body.experience } : {}),
        ...(body.notifyWorkoutReminders !== undefined ? { notifyWorkoutReminders: body.notifyWorkoutReminders } : {}),
        ...(body.notifyMealReminders !== undefined ? { notifyMealReminders: body.notifyMealReminders } : {}),
        ...(body.storePhotos !== undefined ? { storePhotos: body.storePhotos } : {}),
        ...(body.shareAnonymousStats !== undefined ? { shareAnonymousStats: body.shareAnonymousStats } : {}),
      },
    }),
  ]);

  return jsonOk({ saved: true });
});
