import Constants, { ExecutionEnvironment } from 'expo-constants';
import { requireOptionalNativeModule } from 'expo';
import type { WidgetSnapshot } from './data';
import type { WidgetSize, InstallResult } from './widgetPlatform';
const available = () =>
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
  !!requireOptionalNativeModule('ExpoWidgets');
export async function syncNativeWidgets(snapshot: WidgetSnapshot) {
  if (!available()) return;
  const { syncIOSWidgets } = await import('./widgets/syncIOS');
  await syncIOSWidgets(snapshot);
}
export async function requestWidget(_size: WidgetSize): Promise<InstallResult> {
  return available() ? 'manual' : 'preview';
}
