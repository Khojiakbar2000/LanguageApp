import { requireOptionalNativeModule } from 'expo';
import type { WidgetSnapshot } from './data';
import type { WidgetSize, InstallResult } from './widgetPlatform';
type Bridge = {
  canPin: () => boolean;
  requestPin: (size: string) => boolean;
  setSnapshot: (value: string) => boolean;
};
const native = () => requireOptionalNativeModule<Bridge>('HaruPandaWidgets');
export async function syncNativeWidgets(snapshot: WidgetSnapshot) {
  const module = native();
  if (module && !module.setSnapshot(JSON.stringify(snapshot)))
    throw new Error('Widget data update is pending.');
}
export async function requestWidget(size: WidgetSize): Promise<InstallResult> {
  const module = native();
  if (!module) return 'preview';
  return module.canPin() && module.requestPin(size) ? 'requested' : 'manual';
}
