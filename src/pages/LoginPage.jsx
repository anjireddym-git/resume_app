import React, { useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cloud,
  FileText,
  Layers,
  Loader2,
  Lock,
  Mail,
  Moon,
  Search,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

const features = [
  {
    title: 'AI Resume Optimization',
    description: 'Tailor your resume to any job description with AI and get match insights.',
    Icon: Sparkles,
  },
  {
    title: 'DOCX Preview & Export',
    description: 'Live DOCX preview that matches exactly what you export.',
    Icon: FileText,
  },
  {
    title: 'Google Drive Sync',
    description: 'Keep your docs backed up and in sync with Google Drive.',
    Icon: Cloud,
  },
  {
    title: 'Outreach Workspace',
    description: 'Email templates, follow-ups, and replies in one workspace.',
    Icon: Mail,
  },
];

const workflow = [
  {
    step: '1',
    title: 'Optimize',
    description: 'Paste a job description and let AI tailor your resume.',
  },
  {
    step: '2',
    title: 'Preview',
    description: 'Review changes in a live DOCX preview before export.',
  },
  {
    step: '3',
    title: 'Send',
    description: 'Export, sync to Drive, and follow up with confidence.',
  },
];

const resumeRows = [
  ['Personal Information', ''],
  ['Professional Summary', ''],
  ['Technical Skills', '5'],
  ['Experience', '5'],
  ['Education', '2'],
  ['Projects', ''],
  ['Certifications', ''],
  ['Internships', ''],
];

const GoogleSignInButton = ({ isLoading, onClick, className = '' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isLoading}
    className={`h-12 px-5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 whitespace-nowrap shadow-[0_14px_34px_rgba(37,99,235,0.32)] transition-colors ${className}`}
  >
    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
    {isLoading ? 'Signing in...' : 'Continue with Google'}
  </button>
);

const ProductPreview = () => (
  <div className="relative rounded-xl border border-slate-700/80 bg-[#0f141d] shadow-[0_24px_90px_rgba(0,0,0,0.42)] overflow-hidden">
    <div className="h-14 border-b border-slate-700/80 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
        <FileText className="w-4 h-4" />
        Resume
      </div>
      <div className="hidden md:flex items-center gap-2 min-w-0">
        <div className="h-8 min-w-0 w-64 rounded-md border border-slate-700 bg-[#111923] px-3 flex items-center justify-between text-xs text-slate-200">
          <span className="truncate">AI_Data_Scientist_AI_ML_LLM_Python</span>
          <span className="ml-2 text-emerald-400">Saved</span>
        </div>
        <button className="h-8 px-3 rounded-md bg-blue-600 text-white text-xs font-medium inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          Optimize
        </button>
        <button className="h-8 px-3 rounded-md border border-slate-700 text-slate-200 text-xs font-medium">
          Export DOCX
        </button>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[0.68fr_1fr_1.08fr] min-h-[400px]">
      <aside className="hidden lg:flex flex-col border-r border-slate-700/80 bg-[#0d131c]">
        <div className="p-3 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase text-slate-500 tracking-wide">Resumes</span>
            <span className="text-xs text-slate-300">+ New</span>
          </div>
          <div className="h-8 rounded-md border border-slate-700 bg-[#0f1620] px-2 flex items-center gap-2 text-xs text-slate-500">
            <Search className="w-3.5 h-3.5" />
            Search resumes...
          </div>
        </div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span>demo_workspace</span>
            <span className="text-slate-500">11</span>
          </div>
          {[
            'Senior_Software_Engineer_Java...',
            'Python_Full_Stack_Developer...',
            'AI_Technical_Lead_LLM_RAG...',
          ].map((item) => (
            <div key={item} className="pl-4 py-1.5 text-slate-400 truncate">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-2" />
              {item}
            </div>
          ))}
          <div className="pl-4 py-2 rounded-md bg-blue-600/20 text-blue-200 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 inline mr-2" />
            AI_Data_Scientist_AI_ML_LLM...
          </div>
          <div className="pl-4 py-1.5 text-slate-400">New Resume</div>
        </div>
      </aside>

      <section className="border-r border-slate-700/80 bg-[#121923]">
        <div className="h-11 border-b border-slate-800 px-4 flex items-center justify-end gap-2 text-xs text-slate-400">
          <span>Editor</span>
          <span className="px-2 py-1 rounded bg-[#090d13] text-white">Both</span>
          <span>Preview</span>
        </div>
        <div className="divide-y divide-slate-800">
          {resumeRows.map(([label, count]) => (
            <div key={label} className="h-[46px] px-4 flex items-center justify-between text-sm text-slate-100">
              <div className="flex items-center gap-2">
                <span>{label}</span>
                {count && <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/70 text-slate-300">{count}</span>}
              </div>
              <span className="text-slate-500">›</span>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#151d28] p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">DOCX Preview</span>
          <span className="text-xs text-amber-300">Reconnect Drive</span>
        </div>
        <div className="rounded-lg border border-slate-700 bg-[#101721] overflow-hidden h-[330px]">
          <div className="h-9 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400">
            <span>DOCX</span>
            <span>100%</span>
          </div>
          <div className="h-full bg-[#8d8d8d] p-4 overflow-hidden">
            <div className="mx-auto w-[88%] min-h-[390px] bg-[#f8fafc] text-slate-900 px-7 py-6 shadow-xl">
              <h3 className="text-xl font-bold mb-1">Alex Nova</h3>
              <p className="text-sm text-slate-600 mb-4">Principal AI Engineer</p>
              <p className="text-xs text-slate-600 mb-6">(555)010-2408 | alex.nova@example.com</p>
              <h4 className="text-sm font-bold border-b border-slate-200 pb-1 mb-3">PROFESSIONAL SUMMARY</h4>
              <ul className="space-y-2 text-xs leading-relaxed list-disc pl-5">
                <li>Data Scientist with 10+ years building Python-driven analytics.</li>
                <li>Hands-on across Azure ML, Azure OpenAI, and cloud-native systems.</li>
                <li>Built production APIs, batch scoring jobs, and reusable workflows.</li>
                <li>Strong communicator across product, engineering, QA, and operations.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
);

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d131c] text-slate-100">
      <header className="h-16 border-b border-slate-800/90 px-5 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-white" strokeWidth={1.7} />
          <span className="text-lg font-semibold">Resume</span>
        </div>
        <nav className="hidden md:flex items-center gap-10 text-sm text-slate-400">
          <a href="#editor" className="hover:text-white transition-colors">Editor</a>
          <a href="#outreach" className="hover:text-white transition-colors">Outreach</a>
          <a href="#docs" className="hover:text-white transition-colors">Docs</a>
        </nav>
        <GoogleSignInButton isLoading={isLoading} onClick={handleGoogleSignIn} className="hidden sm:inline-flex h-10" />
      </header>

      <main className="px-5 md:px-8 py-7 md:py-8">
        <section className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8 xl:gap-10 items-center">
          <div>
            <h1 className="text-6xl md:text-7xl font-semibold tracking-normal text-white leading-none">
              Resume
            </h1>
            <p className="mt-6 text-xl leading-relaxed text-slate-300 max-w-md">
              Tailor resumes, preview DOCX, and manage outreach in one workspace.
            </p>

            <div className="mt-7 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <GoogleSignInButton isLoading={isLoading} onClick={handleGoogleSignIn} className="w-full sm:w-auto" />
              <a href="#workflow" className="text-blue-400 hover:text-blue-300 text-sm font-medium inline-flex items-center gap-1.5">
                View workflow <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {error && (
              <div className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mt-7 space-y-4">
              {features.map(({ title, description, Icon }) => (
                <div key={title} id={title.includes('Outreach') ? 'outreach' : undefined} className="grid grid-cols-[40px_1fr] gap-3">
                  <div className="w-10 h-10 rounded-lg border border-slate-700 bg-[#111923] flex items-center justify-center text-blue-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-white">{title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div id="editor" className="min-w-0">
            <ProductPreview />
          </div>
        </section>

        <section id="workflow" className="max-w-[1320px] mx-auto mt-7 rounded-xl border border-slate-700/80 bg-[#0f1620] px-5 md:px-10 py-7">
          <h2 className="text-center text-lg font-semibold text-white mb-6">Your workflow, simplified</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {workflow.map(({ step, title, description }, index) => (
              <div key={step} className="relative flex gap-4">
                <div className="h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold flex-shrink-0">
                  {step}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
                {index < workflow.length - 1 && (
                  <ArrowRight className="hidden md:block absolute right-0 top-2 w-5 h-5 text-slate-500 translate-x-1/2" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer id="docs" className="px-5 md:px-8 pb-8">
        <div className="max-w-[900px] mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Your data is private and secure
          </span>
          <span className="hidden sm:block h-4 w-px bg-slate-700" />
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Backed by Google Cloud
          </span>
          <span className="hidden sm:block h-4 w-px bg-slate-700" />
          <span className="inline-flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Works in light or dark mode
          </span>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
