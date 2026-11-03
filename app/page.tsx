import { notFound, redirect } from "next/navigation";
import Island from "./island";

export default function RootPage() {
  if (process.env.SYSTEM === "website") redirect("/home");
  if (process.env.SYSTEM === "desktop") return <Island />;
  notFound();
}
