const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');
module.exports = function withPandaWidgetAssets(config) {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const directory = path.join(
        config.modRequest.platformProjectRoot,
        'ExpoWidgetsTarget/PandaAssets.xcassets/PandaMascot.imageset',
      );
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, '../Contents.json'),
        JSON.stringify({ info: { version: 1, author: 'xcode' } }),
      );
      fs.copyFileSync(
        path.join(config.modRequest.projectRoot, 'src/panda_rive_assets/panda-face.png'),
        path.join(directory, 'panda.png'),
      );
      fs.writeFileSync(
        path.join(directory, 'Contents.json'),
        JSON.stringify({
          images: [{ idiom: 'universal', filename: 'panda.png' }],
          info: { version: 1, author: 'xcode' },
        }),
      );
      return config;
    },
  ]);
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const targets = project.pbxNativeTargetSection();
    const target = Object.entries(targets).find(
      ([key, value]) =>
        !key.endsWith('_comment') && String(value.name).replaceAll('"', '') === 'ExpoWidgetsTarget',
    );
    if (!target)
      throw new Error(
        'The Expo widget target is missing; keep withPandaWidgetAssets before expo-widgets in app.json.',
      );
    const resource = 'ExpoWidgetsTarget/PandaAssets.xcassets';
    const phases = project.hash.project.objects.PBXResourcesBuildPhase ?? {};
    const phaseRef = target[1].buildPhases.find((p) => phases[p.value]);
    if (!phaseRef) project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target[0]);
    if (!project.hasFile(resource)) project.addResourceFile(resource, { target: target[0] });
    // Also repair an existing file reference if a prior prebuild lacked Resources.
    const references = project.pbxFileReferenceSection();
    const reference = Object.entries(references).find(
      ([key, file]) =>
        !key.endsWith('_comment') && String(file.path).replaceAll('"', '') === resource,
    );
    const buildFile =
      reference &&
      Object.entries(project.pbxBuildFileSection()).find(
        ([key, file]) => !key.endsWith('_comment') && file.fileRef === reference[0],
      );
    const phase = target[1].buildPhases
      .map((p) => project.hash.project.objects.PBXResourcesBuildPhase?.[p.value])
      .find(Boolean);
    if (buildFile && !phase.files.some((f) => f.value === buildFile[0]))
      phase.files.push({ value: buildFile[0], comment: 'PandaAssets.xcassets in Resources' });
    return config;
  });
  return config;
};
