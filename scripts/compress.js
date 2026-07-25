import { build, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import JavaScriptObfuscator from 'javascript-obfuscator';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

async function compress() {
  console.log('Bundling components...');
  
  try {
    // Load environment variables to bake in API keys if needed
    const env = loadEnv('production', rootDir, '');

    // Ensure output directory exists
    const outDir = path.resolve(rootDir, 'components');
    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    await build({
      configFile: false,
      root: rootDir,
      plugins: [react()],
      define: {
        // Replace process.env.API_KEY with the actual value during build
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      build: {
        lib: {
          entry: path.resolve(rootDir, 'components/index.tsx'),
          fileName: () => 'index.temp.js',
          formats: ['es']
        },
        outDir: path.resolve(rootDir, 'scripts/temp'),
        emptyOutDir: true,
        rollupOptions: {
          external: [
            'react', 
            'react-dom', 
            'react/jsx-runtime',
            'react-photo-view',
          ],
          output: {
            inlineDynamicImports: true, // Bundle everything into one file
          }
        },
        minify: false, // We obfuscate manually
      },
      logLevel: 'info'
    });

    console.log('Obfuscating...');
    const tempFile = path.resolve(rootDir, 'scripts/temp/index.temp.js');
    
    if (!fs.existsSync(tempFile)) {
        throw new Error('Build failed: output file not found');
    }

    const code = fs.readFileSync(tempFile, 'utf8');

    const obfuscationResult = JavaScriptObfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      debugProtection: false,
      disableConsoleOutput: false,
      identifierNamesGenerator: 'hexadecimal',
      log: false,
      numbersToExpressions: false,
      renameGlobals: false,
      selfDefending: false,
      simplify: true,
      splitStrings: true,
      splitStringsChunkLength: 10,
      stringArray: true,
      stringArrayCallsTransform: false,
      stringArrayEncoding: ['base64'],
      stringArrayIndexShift: true,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 1,
      stringArrayWrappersChainedCalls: false,    
      stringArrayThreshold: 0.5,
      transformObjectKeys: false,
      unicodeEscapeSequence: false
    });

    const outFile = path.resolve(rootDir, 'components/index.min.js');
    fs.writeFileSync(outFile, obfuscationResult.getObfuscatedCode());

    // Create .d.ts to satisfy TypeScript
    // Create a standalone .d.ts file that doesn't depend on source files
    const dtsContent = `import React from 'react';

// Component Types
export const AddPeopleView: React.ComponentType;
export const Button: React.ComponentType<{
  variant?: 'primary' | 'secondary' | 'outline';
  isLoading?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>;
export const CameraAngleView: React.ComponentType;
export const ChangeLightingView: React.ComponentType;
export const Elevation2DView: React.ComponentType;
export const ExpandView: React.ComponentType;
export const ExteriorRenderView: React.ComponentType;
export const FengShuiView: React.ComponentType;
export const FurnitureEditor: React.ComponentType;
export const HomePage: React.ComponentType<{ onEnterApp: () => void }>;
export const ImageComparison: React.ComponentType;
export const ImageEditor: React.ComponentType;
export const ImageUploader: React.ComponentType;
export const InsertBuildingView: React.ComponentType;
export const InteriorRenderView: React.ComponentType;
export const LeadForm: React.ComponentType;
export const MaterialEditor: React.ComponentType;
export const MoodboardView: React.ComponentType;
export const PresentationBoardView: React.ComponentType;
export const PlanningRenderView: React.ComponentType;
export const RenderView: React.ComponentType;
export const RealEstatePosterView: React.ComponentType;
export const AnnotatedRenderView: React.ComponentType;
export const ResultGallery: React.ComponentType;
export const Sidebar: React.ComponentType<{ currentView: any; onChangeView: (view: any) => void }>;
export const SettingsFab: React.ComponentType<{ currentModel: string; onModelChange: (model: string) => void }>;
export const UpscaleView: React.ComponentType;
export const AnalysisView: React.ComponentType;
export const VideoGenerator: React.ComponentType;
export const VirtualTourView: React.ComponentType;
export const FloorPlanTo3DView: React.ComponentType;
export const TechnicalDrawingView: React.ComponentType;
export const SectionPerspectiveView: React.ComponentType;
export const HistoryView: React.ComponentType;
`;
    const dtsFile = path.resolve(rootDir, 'components/index.min.d.ts');
    fs.writeFileSync(dtsFile, dtsContent);

    // Clean up
    fs.rmSync(path.resolve(rootDir, 'scripts/temp'), { recursive: true, force: true });

    console.log('Done! Created components/index.min.js and index.min.d.ts');
  } catch (e) {
    console.error('Error during compression:', e);
    process.exit(1);
  }
}

compress();
