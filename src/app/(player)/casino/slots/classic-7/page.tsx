import { redirect } from "next/navigation";

/** Ruta legada → canonical `/ruleta/classic-7`. */
export default function Classic7LegacyRedirect() {
  redirect("/ruleta/classic-7");
}
