import type { WidgetSnapshot } from './data';
export type WidgetSize = 'small' | 'medium';
export type InstallResult = 'requested' | 'manual' | 'preview';
export async function syncNativeWidgets(_snapshot: WidgetSnapshot): Promise<void> {}
export async function requestWidget(_size: WidgetSize): Promise<InstallResult> {
  return 'preview';
}
