// Generate and repeat native prebuild in a temporary checkout; preserve working app files.
import { mkdtemp, cp, symlink, readFile, readdir, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import xcode from 'xcode';
const root = process.cwd(),
  directory = await mkdtemp(path.join(tmpdir(), 'haru-widgets-prebuild-'));
for (const name of [
  'app.json',
  'package.json',
  'package-lock.json',
  'plugins',
  'modules',
  'src',
  'public',
])
  await cp(path.join(root, name), path.join(directory, name), { recursive: true });
await symlink(path.join(root, 'node_modules'), path.join(directory, 'node_modules'));
console.log(`Native prebuild review directory: ${directory}`);
for (let run = 1; run <= 2; run++) {
  const result = spawnSync(
    process.execPath,
    [path.join(root, 'node_modules/expo/bin/cli'), 'prebuild', '--no-install', '--platform', 'all'],
    { cwd: directory, env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' }, encoding: 'utf8' },
  );
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    process.exitCode = 1;
    break;
  }
  const projectDir = (await readdir(path.join(directory, 'ios'))).find((p) =>
    p.endsWith('.xcodeproj'),
  );
  const project = xcode.project(path.join(directory, 'ios', projectDir, 'project.pbxproj'));
  project.parseSync();
  const target = Object.values(project.pbxNativeTargetSection()).find(
    (t) => String(t.name).replaceAll('"', '') === 'ExpoWidgetsTarget',
  );
  const phases = target?.buildPhases
    .map((p) => project.hash.project.objects.PBXResourcesBuildPhase?.[p.value])
    .filter(Boolean);
  if (!phases?.some((p) => p.files.some((f) => String(f.comment).includes('PandaAssets.xcassets'))))
    throw new Error('Panda asset is not included in the widget target Resources phase.');
  const source = await readFile(
    path.join(directory, 'ios/ExpoWidgetsTarget/PandaCompanion.swift'),
    'utf8',
  );
  if (!source.includes('.systemSmall')) throw new Error('Small widget configuration missing.');
  const medium = await readFile(
    path.join(directory, 'ios/ExpoWidgetsTarget/DailyKorean.swift'),
    'utf8',
  );
  if (!medium.includes('.systemMedium')) throw new Error('Medium widget configuration missing.');
  await access(
    path.join(
      directory,
      'ios/ExpoWidgetsTarget/PandaAssets.xcassets/PandaMascot.imageset/panda.png',
    ),
  );
  console.log(
    `Prebuild ${run}: verified WidgetKit target, both widget families, and actual panda resource membership.`,
  );
}
if (!process.exitCode)
  console.log(
    'Repeated native generation passes. Native compilation still requires Xcode / Android SDK.',
  );
