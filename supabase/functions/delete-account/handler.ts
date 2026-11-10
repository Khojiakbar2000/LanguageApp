import { authenticate, endpoint, HttpError, json, readJSON } from '../_shared/http.ts';
import { z } from 'zod';

export const handler = endpoint(async (req) => {
  const { user, admin } = await authenticate(req);
  z.object({ confirmation: z.literal('DELETE') })
    .strict()
    .parse(await readJSON(req));
  // Select paths from owned message records; never accept object paths from the caller.
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from('messages')
      .select('audio_path')
      .eq('user_id', user.id)
      .not('audio_path', 'is', null)
      .order('sequence')
      .range(offset, offset + 499);
    if (error) throw new HttpError(503, 'Could not prepare account deletion.');
    if (!data.length) break;
    const paths = data
      .map((m) => m.audio_path)
      .filter((path): path is string => typeof path === 'string' && path.startsWith(`${user.id}/`));
    if (paths.length) {
      const removed = await admin.storage.from('tutor-audio').remove(paths);
      if (removed.error)
        throw new HttpError(503, 'Could not delete stored audio. Please retry account deletion.');
    }
    offset += data.length;
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw new HttpError(503, 'Could not delete your account. Please retry.');
  return json({ deleted: true });
});
