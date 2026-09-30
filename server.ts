import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI SDK
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateGeminiContent(aiClient: GoogleGenAI, prompt: string, systemInstruction: string): Promise<string> {
  const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any = null;

  for (const model of candidateModels) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} request failed, attempting candidate:`, err?.message || err);
      lastError = err;
    }
  }

  // Parse error message nicely
  let errMsg = 'AI分析の生成中にエラーが発生しました。';
  if (lastError?.message) {
    try {
      const parsed = JSON.parse(lastError.message);
      if (parsed?.error?.message) {
        errMsg = parsed.error.message;
      } else {
        errMsg = lastError.message;
      }
    } catch {
      errMsg = lastError.message;
    }
  }
  throw new Error(errMsg);
}

// POST /api/ai/analyze-stats
app.post('/api/ai/analyze-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      const currentKey = process.env.GEMINI_API_KEY;
      if (currentKey) {
        ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });
      } else {
        res.status(503).json({
          error: 'GEMINI_API_KEYが設定されていません。AI StudioのSecretsパネルを確認してください。',
        });
        return;
      }
    }

    const {
      playerName,
      grade,
      period,
      periodMatchCount,
      stats,
      prevPeriodInfo,
      prevPeriodMatchCount,
      prevStats,
      allPastStatsSummary,
    } = req.body;

    const prompt = `
以下のゴールキーパー（GK）の試合スタッツデータを元に、前回の記録・過去の推移と比較した詳細な分析レポートを作成してください。

【対象選手情報】
- 選手名: ${playerName || '対象選手'}
- 学年: ${grade || '未設定'}
- 対象期間: ${period || '未設定'}
- 集計試合数: 全 ${periodMatchCount || 0} 試合

【現在のスタッツ数値】
${JSON.stringify(stats, null, 2)}

【直前/比較対象の期間情報】
${prevPeriodInfo ? `期間: ${prevPeriodInfo.grade} ${prevPeriodInfo.period} (全 ${prevPeriodMatchCount || 0} 試合)` : '直前の比較対象データなし（初回集計、または単独期間）'}
${prevStats ? `直前のスタッツ数値:\n${JSON.stringify(prevStats, null, 2)}` : ''}

${allPastStatsSummary && allPastStatsSummary.length > 0 ? `【これまでの全期間の推移サマリー】:\n${JSON.stringify(allPastStatsSummary, null, 2)}` : ''}

【分析とコメントの指示】
GK育成のプロフェッショナルコーチの視点で、以下の4つの項目を含めて具体的かつポジティブに分析・解説してください：
1. 📊【全体傾向・パフォーマンス総括】
   - 試合数や出場機会を踏まえた全体的なスタッツの傾向
2. 🔄【前回・過去記録との比較分析】
   - 直前（または過去）と比較して数値がどう変化したか（セーブ率、判断ミスの回数・1試合平均の変化、パス成功率などの具体的な変動）
   - 特に向上した指標や、注意が必要な指標の指摘
3. ✨【ポジティブな成長点・強み】
   - 選手の強みとして現れている部分や、努力が実を結んでいるポイント
4. 🎯【今後の重点課題・コーチングアドバイス】
   - 次の期・今後の試合に向けた具体的な改善ポイントと意識すべきプレー（判断スピード、ポジショニング、ビルドアップの選択肢など）

読みやすく、選手や保護者へのレポートにそのまま掲載できる品格と温かみのある文体で出力してください。
`;

    const systemInstruction =
      'あなたはサッカーの育成年代（ジュニアユース・ユース）におけるトップクラスのゴールキーパー（GK）専任コーチ兼データアナリストです。スタッツの数値を深く読み解き、前回との違いや成長傾向を言語化し、選手が自信を持ちつつ次への課題に前向きに取り組めるような高品質な分析コメントを提供します。';

    const analysisText = await generateGeminiContent(ai, prompt, systemInstruction);
    res.json({
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating stats analysis:', error);
    res.status(500).json({
      error: error?.message || 'スタッツ分析の生成中にエラーが発生しました。',
    });
  }
});

// POST /api/ai/analyze-tests
app.post('/api/ai/analyze-tests', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!ai) {
      const currentKey = process.env.GEMINI_API_KEY;
      if (currentKey) {
        ai = new GoogleGenAI({
          apiKey: currentKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });
      } else {
        res.status(503).json({
          error: 'GEMINI_API_KEYが設定されていません。AI StudioのSecretsパネルを確認してください。',
        });
        return;
      }
    }

    const {
      playerName,
      grade,
      currentDate,
      kick,
      shootStop,
      prevTest,
      allPastTestsSummary,
    } = req.body;

    const prompt = `
以下のゴールキーパー（GK）のフィジカル＆技術テスト結果を元に、前回のテスト記録と比較した詳細な傾向分析レポートを作成してください。

【対象選手情報】
- 選手名: ${playerName || '対象選手'}
- 学年: ${grade || '未設定'}
- 計測日: ${currentDate || '未設定'}

【今回のテスト数値】
- キック飛距離:
  - 右足: 平均 ${kick?.right?.avg || 0}m / 最大 ${kick?.right?.max || 0}m
  - 左足: 平均 ${kick?.left?.avg || 0}m / 最大 ${kick?.left?.max || 0}m
  - パントキック: 平均 ${kick?.punt?.avg || 0}m / 最大 ${kick?.punt?.max || 0}m
- シュートストップ率:
  - 14m (Short): 全体阻止率 ${shootStop?.short?.totalRate !== null ? shootStop?.short?.totalRate + '%' : '-'} (左: ${shootStop?.short?.leftRate ?? '-'}%, 中央: ${shootStop?.short?.centerRate ?? '-'}%, 右: ${shootStop?.short?.rightRate ?? '-'}%)
  - 19m (Long): 全体阻止率 ${shootStop?.long?.totalRate !== null ? shootStop?.long?.totalRate + '%' : '-'} (左: ${shootStop?.long?.leftRate ?? '-'}%, 中央: ${shootStop?.long?.centerRate ?? '-'}%, 右: ${shootStop?.long?.rightRate ?? '-'}%)
  - 9分割コース詳細: ${JSON.stringify(shootStop?.details || {}, null, 2)}

【前回のテスト記録】
${prevTest ? `計測日: ${prevTest.date || '不明'}
- キック飛距離:
  - 右足: 平均 ${prevTest.kick?.rightAvg || 0}m / 最大 ${prevTest.kick?.rightMax || 0}m
  - 左足: 平均 ${prevTest.kick?.leftAvg || 0}m / 最大 ${prevTest.kick?.leftMax || 0}m
  - パント: 平均 ${prevTest.kick?.puntAvg || 0}m / 最大 ${prevTest.kick?.puntMax || 0}m
- シュートストップ率:
  - 14m: 全体 ${prevTest.shootStop?.shortTotalRate ?? '-'}% (左: ${prevTest.shootStop?.shortLeftRate ?? '-'}%, 中: ${prevTest.shootStop?.shortCenterRate ?? '-'}%, 右: ${prevTest.shootStop?.shortRightRate ?? '-'}%)
  - 19m: 全体 ${prevTest.shootStop?.longTotalRate ?? '-'}% (左: ${prevTest.shootStop?.longLeftRate ?? '-'}%, 中: ${prevTest.shootStop?.longCenterRate ?? '-'}%, 右: ${prevTest.shootStop?.longRightRate ?? '-'}%)` : '前回のテストデータなし（初回計測）'}

${allPastTestsSummary && allPastTestsSummary.length > 0 ? `【これまでの全テスト推移】:\n${JSON.stringify(allPastTestsSummary, null, 2)}` : ''}

【分析とコメントの指示】
GK育成の専門コーチの視点で、以下の項目を含めて具体的かつ建設的に分析してください：
1. 🎯【テスト結果の全体総括】
   - キック力・シュートストップ力全体の総合的な評価
2. 📈【前回記録との比較・変化の分析】
   - キック飛距離（左右差、最大飛距離の伸び、パントの向上など）の変化
   - シュートストップ率（14mショートと19mロングでの変化、コース別の反応の違いなど）の変化
3. 🧤【コース別・距離別のストロングポイントとウィークポイント】
   - コース別（高低・左右）の得意なコースや苦手なコースの傾向分析
4. 💡【次のテストに向けたトレーニング提案】
   - 軸足や踏み込み、ステップワーク、反応スピード向上に向けた実践的なトレーニングアドバイス

選手本人が読んでモチベーションが高まり、次回のテストでどこを伸ばすべきか明確にイメージできる熱意あるフィードバックを作成してください。
`;

    const systemInstruction =
      'あなたはGKのキックフォーム、シュートストップの動作解析、コース別阻止率のデータ分析に精通した育成指導のスペシャリストです。テスト数値の変化（前回比や左右差）を鋭く分析し、具体的で分かりやすい言葉で指導コメントを提供します。';

    const analysisText = await generateGeminiContent(ai, prompt, systemInstruction);
    res.json({
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating test analysis:', error);
    res.status(500).json({
      error: error?.message || 'テスト分析の生成中にエラーが発生しました。',
    });
  }
});

// Vite middleware for dev / static for prod
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
