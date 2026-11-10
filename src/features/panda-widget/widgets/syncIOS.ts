import Companion from './PandaCompanion.ios';
import Daily from './DailyKorean.ios';
import { widgetTimeline, type WidgetSnapshot } from '../data';
export async function syncIOSWidgets(snapshot: WidgetSnapshot) {
  const timeline = widgetTimeline(snapshot);
  Companion.updateTimeline(timeline);
  Daily.updateTimeline(timeline);
}
