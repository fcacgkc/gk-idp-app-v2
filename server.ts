import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  analyzeStats,
  analyzeTests,
  analyzeGameReport,
  analyzePeriodGameReports,
} from './api/_lib/gemini.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '10mb' }));

// POST /api/ai/analyze-stats
app.post('/api/ai/analyze-stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await analyzeStats(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating stats analysis:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'スタッツ分析の生成中にエラーが発生しました。',
    });
  }
});

// POST /api/ai/analyze-tests
app.post('/api/ai/analyze-tests', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await analyzeTests(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating test analysis:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'テスト分析の生成中にエラーが発生しました。',
    });
  }
});

// POST /api/ai/analyze-game-report
app.post('/api/ai/analyze-game-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await analyzeGameReport(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating game report analysis:', error);
    res.status(error?.status || 500).json({
      error: error?.message || 'ゲームレポートAI分析の生成中にエラーが発生しました。',
    });
  }
});

// POST /api/ai/analyze-period-game-reports
app.post('/api/ai/analyze-period-game-reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await analyzePeriodGameReports(req.body);
    res.json(result);
  } catch (error: any) {
    console.error('Error generating period game reports analysis:', error);
    res.status(error?.status || 500).json({
      error: error?.message || '期間ゲームレポート総括の生成中にエラーが発生しました。',
    });
  }
});

// Ensure unmatched /api/* routes always return JSON instead of HTML
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'APIエンドポイントが見つかりません。' });
});

// JSON error middleware for Express (e.g. body parser errors)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api/')) {
    console.error('API middleware error:', err);
    res.status(err?.status || 500).json({
      error: err?.message || 'サーバーエラーが発生しました。',
    });
    return;
  }
  next(err);
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
