// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renderMock = vi.hoisted(() => vi.fn());
const createRootMock = vi.hoisted(() =>
  vi.fn(() => ({
    render: renderMock
  }))
);

vi.mock("react-dom/client", () => ({
  default: {
    createRoot: createRootMock
  }
}));

vi.mock("./App", () => ({
  default: () => null
}));

function createWindowStub(hostname: string) {
  const listeners = new Map<string, Array<() => void>>();
  const location = {
    hostname,
    reload: vi.fn()
  };

  return {
    location,
    addEventListener: vi.fn((type: string, handler: () => void) => {
      const existing = listeners.get(type) ?? [];
      existing.push(handler);
      listeners.set(type, existing);
    }),
    emit(type: string) {
      const handlers = listeners.get(type) ?? [];
      for (const handler of handlers) {
        handler();
      }
    }
  };
}

async function loadMainModule() {
  vi.resetModules();
  return import("./main");
}

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="root"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("main lifecycle", () => {
  it("mounts React app into #root on bootstrap", async () => {
    await loadMainModule();

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledWith(document.getElementById("root"));
    expect(renderMock).toHaveBeenCalledTimes(1);
  });

  it("unregisters service workers on localhost during load", async () => {
    const firstRegistration = { unregister: vi.fn() };
    const secondRegistration = { unregister: vi.fn() };
    const serviceWorker = {
      getRegistrations: vi.fn().mockResolvedValue([firstRegistration, secondRegistration])
    };
    const windowStub = createWindowStub("localhost");

    const { bootstrapServiceWorker } = await loadMainModule();

    bootstrapServiceWorker({
      navigatorObject: { serviceWorker } as unknown as Navigator,
      windowObject: windowStub as unknown as Window,
      isProd: false
    });

    windowStub.emit("load");
    await Promise.resolve();

    expect(serviceWorker.getRegistrations).toHaveBeenCalledTimes(1);
    expect(firstRegistration.unregister).toHaveBeenCalledTimes(1);
    expect(secondRegistration.unregister).toHaveBeenCalledTimes(1);
  });

  it("registers service worker in production and triggers update/reload flow", async () => {
    const waitingWorker = {
      postMessage: vi.fn()
    };

    let stateChangeHandler: (() => void) | undefined;
    const installingWorker = {
      state: "installed",
      postMessage: vi.fn(),
      addEventListener: vi.fn((type: string, handler: () => void) => {
        if (type === "statechange") {
          stateChangeHandler = handler;
        }
      })
    };

    let updateFoundHandler: (() => void) | undefined;
    const registration = {
      waiting: waitingWorker,
      installing: installingWorker,
      addEventListener: vi.fn((type: string, handler: () => void) => {
        if (type === "updatefound") {
          updateFoundHandler = handler;
        }
      })
    };

    const controllerChangeHandlers: Array<() => void> = [];
    const serviceWorker = {
      register: vi.fn().mockResolvedValue(registration),
      controller: { state: "activated" },
      addEventListener: vi.fn((type: string, handler: () => void) => {
        if (type === "controllerchange") {
          controllerChangeHandlers.push(handler);
        }
      })
    };

    const windowStub = createWindowStub("example.com");

    const { bootstrapServiceWorker } = await loadMainModule();

    bootstrapServiceWorker({
      navigatorObject: { serviceWorker } as unknown as Navigator,
      windowObject: windowStub as unknown as Window,
      isProd: true
    });

    windowStub.emit("load");
    await Promise.resolve();

    expect(serviceWorker.register).toHaveBeenCalledWith("./sw.js");
    expect(waitingWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });

    updateFoundHandler?.();
    stateChangeHandler?.();
    expect(installingWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" });

    controllerChangeHandlers[0]?.();
    controllerChangeHandlers[0]?.();
    expect(windowStub.location.reload).toHaveBeenCalledTimes(1);
  });

  it("handles missing browser service worker APIs without throwing", async () => {
    const windowStub = createWindowStub("example.com");

    const { bootstrapServiceWorker } = await loadMainModule();

    expect(() => {
      bootstrapServiceWorker({
        navigatorObject: { serviceWorker: {} } as unknown as Navigator,
        windowObject: windowStub as unknown as Window,
        isProd: true
      });
      windowStub.emit("load");
    }).not.toThrow();
  });
});
