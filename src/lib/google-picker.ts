"use client";
// Google Picker grants drive.file access to exactly the files the owner selects.
// The browser requests its own drive.file-only token; the server's broader token never leaves it.
type TokenResponse = { access_token?: string; error?: string };
type PickerDocument = { id: string; name: string };
type PickerData = { action: string; docs?: PickerDocument[] };
type PickerChain = { [method: string]: (...args: unknown[]) => PickerChain } & { build(): { setVisible(visible: boolean): void } };
interface GoogleGlobals {
  gapi: { load(name: string, callback: () => void): void };
  google: {
    accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback: () => void }): { requestAccessToken(options: { prompt: string }): void } } };
    picker: { DocsView: new (view?: string) => PickerChain; PickerBuilder: new () => PickerChain; ViewId: { DOCS: string }; Feature: { MULTISELECT_ENABLED: string }; Action: { PICKED: string; CANCEL: string } };
  };
}
export type PickerConfig = { clientId: string; appId: string; developerKey: string };
const accepted = ["application/pdf", "text/plain", "image/png", "image/jpeg", "application/vnd.google-apps.document"].join(",");

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing?.dataset.loaded) return resolve();
    const script = existing || Object.assign(document.createElement("script"), { src, async: true });
    script.addEventListener("load", () => { script.dataset.loaded = "true"; resolve(); }, { once: true });
    script.addEventListener("error", () => reject(new Error("Google Drive could not load. Check your connection and try again.")), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

export async function pickDriveFiles(config: PickerConfig): Promise<PickerDocument[]> {
  await Promise.all([loadScript("https://accounts.google.com/gsi/client"), loadScript("https://apis.google.com/js/api.js")]);
  const globals = window as unknown as GoogleGlobals;
  await new Promise<void>((resolve) => globals.gapi.load("picker", resolve));
  const token = await new Promise<string>((resolve, reject) => {
    globals.google.accounts.oauth2.initTokenClient({
      client_id: config.clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => response.access_token ? resolve(response.access_token) : reject(new Error("Google Drive access was not granted.")),
      error_callback: () => reject(new Error("Google Drive access was not granted.")),
    }).requestAccessToken({ prompt: "" });
  });
  const { picker } = globals.google;
  return new Promise((resolve) => {
    const view = new picker.DocsView(picker.ViewId.DOCS).setMimeTypes(accepted).setIncludeFolders(true).setSelectFolderEnabled(false);
    new picker.PickerBuilder().addView(view).enableFeature(picker.Feature.MULTISELECT_ENABLED).setOAuthToken(token).setDeveloperKey(config.developerKey).setAppId(config.appId)
      .setCallback((data: unknown) => {
        const result = data as PickerData;
        if (result.action === picker.Action.PICKED) resolve((result.docs || []).map(({ id, name }) => ({ id, name })));
        if (result.action === picker.Action.CANCEL) resolve([]);
      }).build().setVisible(true);
  });
}
