import { Browser } from "@capacitor/browser";

export async function openInAppBrowser(url: string): Promise<void> {
  try {
    await Browser.open({ url });
  } catch (e) {
    // Fallback: open in system browser
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function closeInAppBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    // No-op if not open or unsupported
  }
}
