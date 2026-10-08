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

// POST /api/ai/analyze-game-report
app.post('/api/ai/analyze-game-report', async (req: Request, res: Response): Promise<void> => {
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
      opponent,
      date,
      matchType,
      attackComment,
      defenseComment
    } = req.body;

    const prompt = `
以下のゴールキーパー（GK）の試合振り返り（攻撃・守備）を元に、プロのGKコーチとして建設的なアドバイスと総括コメントを作成してください。

【試合情報】
- 選手名: ${playerName || '対象選手'}
- 対戦相手: ${opponent || '不明'}
- 試合日: ${date || '未設定'}
- 試合区分: ${matchType || '未設定'}

【攻撃面の振り返り】
${attackComment || '特になし'}

【守備面の振り返り】
${defenseComment || '特になし'}

【指示】
GK指導の視点から、以下の内容をコンパクトかつ具体的にまとめてください：
1. ⚔️【攻撃面へのコーチング評価・アドバイス】（スキャン、サポート、ボールスキル、フリーマンの活用、時間を届ける等の観点も加味）
2. 🛡️【守備面へのコーチング評価・アドバイス】（シュートストップ、1vs1対応、クロス対応、スイーパー守備、予測・準備、判断・決断、コーチング等の観点も加味）
3. 🎯【次戦に向けた重点テーマ・推奨トレーニング】

選手がポジティブに次の試合・練習に取り組める温かみと説得力のある言葉で記載してください。
`;

    const systemInstruction =
      'あなたはジュニアユース・ユース年代のゴールキーパー（GK）育成を専門とするプロフェッショナルコーチです。攻撃（ビルドアップ・配給）と守備（ゴールキーピング・ディフェンス統制）の両面から的確なフィードバックと成長のためのアドバイスを提供します。';

    const analysisText = await generateGeminiContent(ai, prompt, systemInstruction);
    res.json({
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating game report analysis:', error);
    res.status(500).json({
      error: error?.message || 'ゲームレポートAI分析の生成中にエラーが発生しました。',
    });
  }
});

// POST /api/ai/analyze-period-game-reports
app.post('/api/ai/analyze-period-game-reports', async (req: Request, res: Response): Promise<void> => {
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
      gameReports
    } = req.body;

    if (!Array.isArray(gameReports) || gameReports.length === 0) {
      res.status(400).json({
        error: '対象期間のゲームレポートが存在しません。',
      });
      return;
    }

    const prompt = `
以下のゴールキーパー（GK）の対象期間（${grade || ''} ${period || ''}）における全ゲームレポート（攻撃・守備の振り返り、コーチコメント）を網羅的に分析し、選手の成長傾向・課題・強みをまとめた総合的な「期間総括レポート」を作成してください。

【対象選手】: ${playerName || '対象選手'} (${grade || ''})
【対象期間】: ${period || '未指定'}
【対象試合数】: ${gameReports.length}試合

【各試合のゲームレポート詳細】:
${gameReports.map((gr: any, idx: number) => `
■ 第${idx + 1}試合: ${gr.date || '日付不明'} vs ${gr.opponent || '対戦相手未設定'} [区分: ${gr.matchType || '試合'}]
・攻撃の振り返り: ${gr.attackComment || '未入力'}
・守備の振り返り: ${gr.defenseComment || '未入力'}
${gr.generalNotes ? `・総括メモ: ${gr.generalNotes}` : ''}
${gr.coachName ? `・担当コーチ: ${gr.coachName}` : ''}
`).join('\n')}

【総括分析の指示】:
GK育成専門コーチおよびテクニカルアナリストの視点で、期間内の複数試合を通じた傾向や変化を踏まえ、以下の項目を整理して具体的かつ論理的にまとめてください：
1. 🎯【期間全体の総括と総合評価】
   - この期間（${gameReports.length}試合）を通じて見られたパフォーマンスの全体所感と成長度
2. ⚔️【攻撃面の振り返り・成長傾向】
   - スキャン、サポート、ボールスキル、フリーマンの活用、時間を届ける等の観点から評価
3. 🛡️【守備面の振り返り・成長傾向】
   - シュートストップ、1vs1対応、クロス対応、スイーパー守備、予測・準備、判断・決断、コーチング等の観点から評価
4. 🌟【特に評価できるストロングポイント（期間内の顕著な成長点）】
5. 💡【次期に向けた重点育成テーマと実践アドバイス】
   - 今後フォーカスすべき課題と、日々の練習で意識すべき具体的なGKアクション

※ 各試合の具体的な対戦相手やシーンを適宜引用し、選手自身が納得感を持って読める、熱意と温かみのあるコーチング総括を作成してください。
`;

    const systemInstruction =
      'あなたはジュニアユース・ユース年代のゴールキーパー（GK）育成を専門とするプロフェッショナルコーチ・テクニカルアナリストです。試合ごとの攻撃・守備の振り返りを横断的に分析し、選手の持続的成長を促す説得力のある期間総括を提供します。';

    const analysisText = await generateGeminiContent(ai, prompt, systemInstruction);
    res.json({
      analysis: analysisText,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error generating period game reports analysis:', error);
    res.status(500).json({
      error: error?.message || '期間ゲームレポート総括の生成中にエラーが発生しました。',
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
