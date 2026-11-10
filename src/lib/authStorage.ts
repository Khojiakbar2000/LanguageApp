export interface SecureKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export function createAuthStorage(secureStore: SecureKeyValueStore, isWeb: boolean) {
  return {
    async getItem(name: string) {
      if (isWeb) {
        try {
          return globalThis.localStorage.getItem(name);
        } catch {
          return null;
        }
      }
      const count = Number(await secureStore.getItemAsync(`${name}.count`));
      if (!Number.isInteger(count) || count < 1 || count > 100) return null;
      const parts = await Promise.all(
        Array.from({ length: count }, (_, i) => secureStore.getItemAsync(`${name}.${i}`)),
      );
      return parts.some((part) => part === null) ? null : parts.join('');
    },
    async setItem(name: string, value: string) {
      if (isWeb) {
        globalThis.localStorage.setItem(name, value);
        return;
      }
      await this.removeItem(name);
      const parts = value.match(/[\s\S]{1,1500}/g) ?? [];
      for (let i = 0; i < parts.length; i++)
        await secureStore.setItemAsync(`${name}.${i}`, parts[i]);
      await secureStore.setItemAsync(`${name}.count`, String(parts.length));
    },
    async removeItem(name: string) {
      if (isWeb) {
        try {
          globalThis.localStorage.removeItem(name);
        } catch {
          /* storage may be disabled */
        }
        return;
      }
      const count = Number(await secureStore.getItemAsync(`${name}.count`));
      await secureStore.deleteItemAsync(`${name}.count`);
      if (Number.isInteger(count) && count > 0 && count <= 100) {
        await Promise.all(
          Array.from({ length: count }, (_, i) => secureStore.deleteItemAsync(`${name}.${i}`)),
        );
      }
    },
  };
}
