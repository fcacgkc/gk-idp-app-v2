import { analyzePeriodGameReports, handleVercelAiRequest } from '../_lib/gemini';

export const maxDuration = 60;

export default async function handler(req: any, res: any) {
  await handleVercelAiRequest(
    req,
    res,
    analyzePeriodGameReports,
    '期間ゲームレポート総括の生成中にエラーが発生しました。'
  );
}
