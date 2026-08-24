import { ExtensionSettings } from "@/common/extension/settings";
import { createService, type ProxiedObject } from "@/common/messaging";

import { WindowManager } from "@/common/windowManager";

class BackgroundService {
  private readonly windowManager = new WindowManager();

  public async getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    return tabs[0] ?? undefined;
  }

  public async reloadActiveTab(): Promise<void> {
    const tab = await this.getActiveTab();
    if (tab?.id !== undefined) {
      await browser.tabs.reload(tab.id);
    }
  }

  public async setExtensionEnabled(enabled: boolean) {
    await ExtensionSettings.enabled.setValue(enabled);
  }

  public async getExtensionEnabled() {
    return ExtensionSettings.enabled.getValue();
  }

  public async openDataManager() {
    await this.windowManager.open(browser.runtime.getURL("dataManager.html"), {
      focused: true,
      width: 1000,
      height: 800,
    });
  }

  public async closeDataManager() {
    await this.windowManager.close(browser.runtime.getURL("dataManager.html"));
  }

  // chrome.identity is only available in privileged extension pages
  // (background, popup) — not in the content script running inside the
  // offscreen document's iframe, where the rest of cloud sign-in actually
  // happens. So the token is fetched here and handed to backend.cloudSignInWithGoogle.
  public async getGoogleAuthToken(): Promise<string> {
    const result = await browser.identity.getAuthToken({ interactive: true });
    if (!result.token) {
      throw new Error("Google sign-in was cancelled or denied.");
    }
    return result.token;
  }
}

const backgroundService = createService({
  context: BackgroundService,
  namespace: "BackgroundService",
  heartbeatTimeout: import.meta.env.SERVICE_TIMEOUT,
});

namespace backgroundService {
  export type Instance = ProxiedObject<BackgroundService>;
}

export default backgroundService;
