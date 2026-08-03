import { setupOneWayBridge } from "../core/bridge";
import { Adapter } from "../core/adapter";

import type { Message } from "../core/message";
import type { OnMessageCallback } from "../core/adapter";

import type { Browser } from "wxt/browser";

export interface BackgroundMessage extends Message {
  tab?: Browser.tabs.Tab;
}

export default class BackgroundAdapter extends Adapter {
  private readonly ports: Record<string, Set<Browser.runtime.Port>> = {};
  private readonly callbacks: Set<OnMessageCallback> = new Set();

  private readonly onConnect = (port: Browser.runtime.Port) => {
    this.handlePort(port);
  };

  public constructor() {
    super();

    setupOneWayBridge({
      name: "background",
      from: this,
      to: this,
    });

    browser.runtime.onConnect.addListener(this.onConnect);
  }

  private async getActiveTab(): Promise<Browser.tabs.Tab | undefined> {
    return browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
  }

  private hasConnectedPorts(tab?: Browser.tabs.Tab) {
    const key = this.getKeyForTab(tab);
    return !!key && (this.ports[key]?.size ?? 0) > 0;
  }

  private isWebTab(tab?: Browser.tabs.Tab) {
    try {
      const protocol = new URL(tab?.url ?? "").protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }

  private hasConnectedWebPorts(tab?: Browser.tabs.Tab) {
    return this.isWebTab(tab) && this.hasConnectedPorts(tab);
  }

  private async getFallbackTab(): Promise<Browser.tabs.Tab | undefined> {
    if (!import.meta.env.FIREFOX) return;

    const tabs = await browser.tabs.query({
      url: ["https://mapgenie.io/*"],
    });

    return tabs.find((tab) => this.hasConnectedWebPorts(tab));
  }

  private async getTargetTab(tab?: Browser.tabs.Tab) {
    if (tab && (!import.meta.env.FIREFOX || this.isWebTab(tab))) return tab;

    const activeTab = await this.getActiveTab();
    if (
      this.hasConnectedPorts(activeTab) &&
      (!import.meta.env.FIREFOX || this.isWebTab(activeTab))
    ) {
      return activeTab;
    }

    // Firefox has no offscreen document. Extension pages such as the Data
    // Manager therefore need to reach a backend provider in a MapGenie tab.
    return (await this.getFallbackTab()) ?? activeTab;
  }

  private getKeyForTab(tab?: Browser.tabs.Tab) {
    return tab?.id?.toString() ?? "";
  }

  public isValidMessage(message: any): message is BackgroundMessage {
    return super.isValidMessage(message);
  }

  private handlePort(port: Browser.runtime.Port) {
    const tab = port.sender?.tab;
    const key = this.getKeyForTab(tab);

    port.onMessage.addListener(async (message) => {
      if (!this.isValidMessage(message)) return;

      message.tab ??= tab;

      this.callbacks.forEach((cb) => cb(message));
    });

    port.onDisconnect.addListener(() => {
      this.ports[key]?.delete(port);
    });

    this.ports[key] ??= new Set();
    this.ports[key].add(port);
  }

  public onMessage(callback: OnMessageCallback) {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  public async sendMessage(message: BackgroundMessage) {
    // Provider responses must return to the tab that originated the request.
    // Only user requests from Firefox extension pages need a MapGenie fallback.
    const tab =
      message.sender === "provider" && message.tab
        ? message.tab
        : await this.getTargetTab(message.tab);
    const key = this.getKeyForTab(tab);

    // Send to all global ports
    this.ports[""]?.forEach((port) => {
      port.postMessage(message);

      // Consume runtime.lastError to prevent uncaught exceptions
      const _ = browser.runtime.lastError;
    });

    // Send to specific tab ports
    if (key) {
      this.ports[key]?.forEach((port) => {
        port.postMessage(message);

        // Consume runtime.lastError to prevent uncaught exceptions
        const _ = browser.runtime.lastError;
      });
    }
  }

  public disconnect() {
    browser.runtime.onConnect.removeListener(this.onConnect);
  }
}
