export type FudgeSettings = {
  waveColor: string;
  randomWaveColor: boolean;
  animateWave: boolean;
  voiceFeedback: boolean;
};

export const DEFAULT_FUDGE_SETTINGS: FudgeSettings = {
  waveColor: "#ff637d",
  randomWaveColor: true,
  animateWave: true,
  voiceFeedback: true,
};
