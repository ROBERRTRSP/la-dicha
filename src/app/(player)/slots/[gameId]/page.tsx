import { redirect } from "next/navigation";

export default async function SlotsGameRedirect({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  redirect(`/ruleta/${gameId}`);
}
