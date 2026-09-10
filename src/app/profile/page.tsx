import { getCurrentUser } from "@/lib/db";
import { ProfileClient } from "@/components/ProfileClient";
import { parseList } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  const visionConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
  const remoteFoodEnabled = process.env.ENABLE_REMOTE_FOOD_LOOKUP !== "0";

  return (
    <ProfileClient
      initial={{
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
      }}
      services={{ visionConfigured, remoteFoodEnabled }}
    />
  );
}
