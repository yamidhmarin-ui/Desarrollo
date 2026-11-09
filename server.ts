import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI if key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (err) {
    console.warn('Could not initialize GoogleGenAI client:', err);
  }
}

// Favicon handler to prevent browser console 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// AI Copilot interpretation endpoint
app.post('/api/ai/interpret', async (req, res) => {
  try {
    const { prompt, type, context } = req.body;

    if (!process.env.GEMINI_API_KEY || !ai) {
      return res.status(200).json({
        available: false,
        message: 'Clave de Gemini API no configurada en el servidor. Se utilizará el motor econométrico determinístico integrado.',
      });
    }

    const systemInstruction = `Eres un Científico de Datos Senior y Econometrista experto en analítica de negocios y toma de decisiones empresariales.
Tu objetivo es analizar resultados de regresión múltiple, reglas de negocio, diagnósticos de multicolinealidad/heterocedasticidad y escenarios de simulación para directores ejecutivos y gerentes.
Responde SIEMPRE en español claro, ejecutivo, riguroso pero sin jerga innecesaria.
Prioriza la distinción entre correlación y causalidad económica. Advierte sobre riesgos operativos, elasticidades y márgenes de ganancia.`;

    const fullPrompt = `Contexto del análisis:
${JSON.stringify(context, null, 2)}

Solicitud del usuario:
${prompt || 'Genera una síntesis ejecutiva, interpretación de coeficientes y recomendaciones estratégicas.'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      available: true,
      text: response.text,
    });
  } catch (error: any) {
    console.error('Error in /api/ai/interpret:', error);
    return res.status(500).json({
      available: false,
      error: error.message || 'Error al comunicarse con Gemini API',
    });
  }
});

// ZIP Export endpoint for GitHub publishing
app.get('/api/export-zip', async (req, res) => {
  try {
    const { default: JSZip } = await import('jszip');
    const fs = await import('fs/promises');
    const zip = new JSZip();

    async function addFolderToZip(dirPath: string, zipFolder: any) {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '.git' ||
          entry.name.startsWith('.tmp')
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          await addFolderToZip(fullPath, subFolder);
        } else if (entry.isFile()) {
          const content = await fs.readFile(fullPath);
          zipFolder.file(entry.name, content);
        }
      }
    }

    await addFolderToZip(__dirname, zip);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="regressio-business-ai.zip"');
    res.send(buffer);
  } catch (err: any) {
    console.error('Error generating project zip:', err);
    res.status(500).json({ error: 'No se pudo generar el archivo ZIP del proyecto' });
  }
});

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
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Regressio Business AI server running at http://0.0.0.0:${port}`);
  });
}

startServer();
