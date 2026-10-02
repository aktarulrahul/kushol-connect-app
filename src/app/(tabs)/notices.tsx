// Legacy /notices list route — redirects to the Notifications tab (owner 2026-10-02).
// Detail stays at /notices/[id]. NoticeRow re-exported for any remaining imports.
import { Redirect } from "expo-router";

export { NoticeRow } from "./notifications";

export default function NoticesRedirect() {
  return <Redirect href="/notifications" />;
}
