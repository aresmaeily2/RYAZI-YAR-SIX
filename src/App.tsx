import React, { useMemo, useState } from 'react';
import { CURRICULUM_CHAPTERS } from './data/curriculumData';
import type { Question } from './types/curriculum';
import { toPersianDigits } from './utils/mathEngine';
import { buildExamQuestions, examBandLabel, scoreExam, wrongAnswerIds, type ExamAnswers } from './utils/examEngine';
import { useLearnerState } from './hooks/useLearnerState';
import { QuestionCard } from './components/QuestionCard';
import { LessonFlowPlayer } from './components/LessonFlowPlayer';
import { DiagnosticDashboard, ParentSkillReport } from './components/DiagnosticDashboard';
import { AssistantPanel } from './components/AssistantPanel';
import { flowForLesson } from './data/flows';
import { CoordinateLab, CylinderLab, FractionLab, PercentageLab } from './components/InteractiveLabs';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  Flame,
  Home,
  ListChecks,
  RotateCcw,
  Star,
  Trophy,
  Upload,
} from 'lucide-react';

type Tab = 'dashboard' | 'learn' | 'exam' | 'analytics';
type ExamPhase = 'setup' | 'running' | 'result';

const colorMap: Record<string, { bg: string; text: string; bar: string }> = {
  indigo: { bg: 'bg-indigo-600', text: 'text-indigo-700', bar: 'bg-indigo-600' },
  emerald: { bg: 'bg-emerald-600', text: 'text-emerald-700', bar: 'bg-emerald-600' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-700', bar: 'bg-amber-500' },
  rose: { bg: 'bg-rose-600', text: 'text-rose-700', bar: 'bg-rose-600' },
  cyan: { bg: 'bg-cyan-600', text: 'text-cyan-700', bar: 'bg-cyan-600' },
  violet: { bg: 'bg-violet-600', text: 'text-violet-700', bar: 'bg-violet-600' },
  teal: { bg: 'bg-teal-600', text: 'text-teal-700', bar: 'bg-teal-600' },
};

const App: React.FC = () => {
  const learner = useLearnerState();
  const { state } = learner;

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(state.lastVisitedChapterId);
  const [selectedLessonId, setSelectedLessonId] = useState<string>(state.lastVisitedLessonId);

  // وضعیت آزمون
  const [examPhase, setExamPhase] = useState<ExamPhase>('setup');
  const [examChapterId, setExamChapterId] = useState<string | null>(null);
  const [examAnswers, setExamAnswers] = useState<ExamAnswers>({});
  const [examQuestions, setExamQuestions] = useState<Question[]>([]);
  const [importStatus, setImportStatus] = useState<string>('');
  /** حالت مسیر یادگیری چندمرحله‌ای درس فعال */
  const [flowMode, setFlowMode] = useState<boolean>(false);

  const currentChapter = useMemo(
    () => CURRICULUM_CHAPTERS.find((c) => c.id === selectedChapterId) ?? CURRICULUM_CHAPTERS[0],
    [selectedChapterId]
  );
  const currentLesson = useMemo(
    () => currentChapter.lessons.find((l) => l.id === selectedLessonId) ?? currentChapter.lessons[0],
    [currentChapter, selectedLessonId]
  );

  /** نقشه همه پرسش‌ها (کتاب + پرسش‌های جریان‌ها) برای استفاده در مسیر یادگیری */
  const allQuestionsById = useMemo(() => {
    const map = new Map<string, Question>();
    for (const ch of CURRICULUM_CHAPTERS) {
      for (const les of ch.lessons) {
        for (const q of les.questions) map.set(q.id, q);
      }
    }
    return map;
  }, []);

  const openLesson = (chapterId: string, lessonId: string) => {
    setSelectedChapterId(chapterId);
    setSelectedLessonId(lessonId);
    learner.updateLastVisited(chapterId, lessonId);
    setFlowMode(false);
    setActiveTab('learn');
  };

  const startExam = (chapterId: string | null) => {
    setExamChapterId(chapterId);
    setExamQuestions(buildExamQuestions(CURRICULUM_CHAPTERS, chapterId));
    setExamAnswers({});
    setExamPhase('running');
  };

  const retryWrongOnly = () => {
    const wrongIds = new Set(wrongAnswerIds(examQuestions, examAnswers));
    const wrongQuestions = examQuestions.filter((q) => wrongIds.has(q.id));
    if (wrongQuestions.length === 0) return;
    setExamQuestions(wrongQuestions);
    setExamAnswers({});
    setExamPhase('running');
  };

  const handleExamSubmit = (q: Question, answer: string, hintsUsed: number) => {
    const result = learner.recordAttempt(q, answer, hintsUsed, 'exam');
    setExamAnswers((prev) => ({ ...prev, [q.id]: answer }));
    return result;
  };

  const examScore = useMemo(() => scoreExam(examQuestions, examAnswers), [examQuestions, examAnswers]);

  const exportBackup = () => {
    try {
      const blob = new Blob([learner.exportBackup()], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ryaziyarsix-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus('فایل پشتیبان با موفقیت ساخته شد.');
    } catch {
      setImportStatus('ساخت فایل پشتیبان در این مرورگر ممکن نیست.');
    }
  };

  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const ok = learner.importBackup(String(reader.result ?? ''));
      setImportStatus(ok ? 'پشتیبان با موفقیت بازیابی شد.' : 'فایل پشتیبان معتبر نیست.');
    };
    reader.onerror = () => setImportStatus('خواندن فایل ناموفق بود.');
    reader.readAsText(file);
  };

  const totalQuestions = useMemo(
    () => CURRICULUM_CHAPTERS.reduce((acc, c) => acc + c.lessons.reduce((a, l) => a + l.questions.length, 0), 0),
    []
  );

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'داشبورد', icon: Home },
    { id: 'learn', label: 'درس‌نامه و تمرین', icon: BookOpen },
    { id: 'exam', label: 'آزمون', icon: Award },
    { id: 'analytics', label: 'گزارش پیشرفت', icon: BarChart3 },
  ];

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col text-slate-800">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:border focus:border-indigo-300">
          پرش به محتوای اصلی
        </a>

        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white flex items-center justify-center font-black text-lg shadow-glow" aria-hidden="true">
                ۶
                <span className="absolute -top-1 -left-1 w-3 h-3 rounded-full bg-sun-400 border-2 border-white" />
              </div>
              <div>
                <h1 className="font-black text-base sm:text-lg text-slate-900 tracking-tight">ریاضی‌یار ششم</h1>
                <p className="text-[11px] text-slate-500 font-medium">آموزش تعاملی ریاضی پایه ششم ابتدایی</p>
              </div>
            </div>

            <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto max-w-full" aria-label="ناوبری اصلی">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-base ease-spring whitespace-nowrap ${
                      active
                        ? 'bg-gradient-to-l from-brand-600 to-violet-600 text-white shadow-glow scale-[1.02]'
                        : 'text-slate-600 hover:text-brand-700 hover:bg-white/70'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="chip bg-sun-100 text-sun-700 shadow-sm" title="امتیاز تجربه">
                <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                {toPersianDigits(state.xp)}
              </span>
              <span className="chip bg-orange-100 text-orange-800 shadow-sm" title="زنجیره روزهای مطالعه">
                <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                {toPersianDigits(state.streakDays)} روز
              </span>
              <span className="hidden sm:inline-flex chip bg-emerald-50 text-emerald-700 shadow-sm">
                تسلط کل: ٪{toPersianDigits(learner.overallMastery)}
              </span>
            </div>
          </div>
        </header>

        <main id="main-content" className="max-w-6xl w-full mx-auto px-4 py-6 flex-1">
          {/* ================= داشبورد ================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-rise">
              <div className="relative overflow-hidden bg-gradient-to-l from-brand-800 via-brand-700 to-violet-600 text-white rounded-3xl p-6 sm:p-8 shadow-lift flex flex-wrap items-center justify-between gap-4">
                <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
                  <span className="absolute top-4 left-8 text-4xl font-black text-white/10 animate-float select-none">+</span>
                  <span className="absolute bottom-3 left-1/4 text-3xl font-black text-white/10 animate-float select-none" style={{ animationDelay: '1.2s' }}>×</span>
                  <span className="absolute top-8 left-1/2 text-2xl font-black text-white/10 animate-float select-none" style={{ animationDelay: '2.1s' }}>=</span>
                  <span className="absolute -bottom-8 left-16 w-28 h-28 rounded-full bg-white/5" />
                  <span className="absolute -top-10 right-1/3 w-36 h-36 rounded-full bg-violet-400/20 blur-2xl" />
                  <span className="absolute bottom-4 right-6 text-xl font-black text-white/10 animate-float select-none" style={{ animationDelay: '0.6s' }}>÷</span>
                </div>
                <div className="relative">
                  <span className="chip bg-white/15 backdrop-blur-sm text-white/90">پوشش هر ۷ فصل کتاب درسی — {toPersianDigits(totalQuestions)} پرسش</span>
                  <h2 className="text-xl sm:text-2xl font-black mt-2 tracking-tight">سلام {state.studentName}!</h2>
                  <p className="text-sm text-brand-100 mt-1 font-medium">
                    یادگیری را از آخرین مبحث مطالعه‌شده ادامه بده یا فصل دلخواهت را انتخاب کن.
                  </p>
                </div>
                <button
                  onClick={() => openLesson(state.lastVisitedChapterId, state.lastVisitedLessonId)}
                  className="relative px-5 py-2.5 bg-white text-brand-700 font-bold text-sm rounded-xl shadow-lift hover:bg-brand-50 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-base ease-spring"
                >
                  ادامه آخرین درس: {currentLesson.title}
                </button>
              </div>

              {/* داشبورد تشخیصی: گام بعدی، وضعیت مهارت‌ها، مرورهای سررسید و سنجه‌ها */}
              <DiagnosticDashboard
                skillStates={learner.skillStates}
                attempts={state.attempts}
                completedLessonCount={state.completedLessonIds.length}
                totalLessons={CURRICULUM_CHAPTERS.reduce((a, c) => a + c.lessons.length, 0)}
                onOpenSkill={(lessonId) => {
                  const ch = CURRICULUM_CHAPTERS.find((c) => c.lessons.some((l) => l.id === lessonId));
                  if (ch) openLesson(ch.id, lessonId);
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {CURRICULUM_CHAPTERS.map((ch) => {
                  const mastery = learner.masteryList.find((m) => m.chapterId === ch.id);
                  const pct = mastery?.masteryPercent ?? 0;
                  const colors = colorMap[ch.color] ?? colorMap.indigo;
                  return (
                    <div key={ch.id} className="card card-hover relative overflow-hidden p-5 pt-6 flex flex-col justify-between">
                      <span className={`absolute top-0 right-0 left-0 h-1.5 ${colors.bar}`} aria-hidden="true" />
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                          <span className="chip bg-slate-100 text-slate-600">فصل {toPersianDigits(ch.number)}</span>
                          <span className={colors.text}>تسلط: ٪{toPersianDigits(pct)}</span>
                        </div>
                        <h3 className="font-black text-base text-slate-900">{ch.title}</h3>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ch.subtitle}</p>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4 shadow-inner" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`درصد تسلط فصل ${toPersianDigits(ch.number)}`}>
                          <div className={`h-full ${colors.bar} transition-all duration-slow ease-glide`} style={{ width: `${pct}%` }} />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-2 font-medium">
                          {toPersianDigits(ch.lessons.length)} درس — {toPersianDigits(ch.lessons.reduce((a, l) => a + l.questions.length, 0))} پرسش
                        </p>
                      </div>
                      <button
                        onClick={() => openLesson(ch.id, ch.lessons[0].id)}
                        className="mt-4 w-full py-2.5 rounded-xl bg-brand-50 hover:bg-gradient-to-l hover:from-brand-600 hover:to-violet-600 hover:text-white text-brand-700 text-xs font-bold transition-all duration-base ease-spring active:scale-[0.98]"
                      >
                        ورود به درس‌نامه و تمرین‌ها
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= درس‌نامه و تمرین ================= */}
          {activeTab === 'learn' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-rise">
              <aside className="card p-4 h-fit space-y-3 lg:sticky lg:top-24 self-start">
                <h2 className="font-black text-sm text-slate-900">فهرست فصل‌ها و درس‌ها</h2>
                <div className="space-y-2">
                  {CURRICULUM_CHAPTERS.map((ch) => (
                    <div key={ch.id} className="space-y-1">
                      <button
                        onClick={() => {
                          setSelectedChapterId(ch.id);
                          setSelectedLessonId(ch.lessons[0].id);
                          learner.updateLastVisited(ch.id, ch.lessons[0].id);
                        }}
                        className={`w-full text-right px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-base ease-spring ${
                          ch.id === currentChapter.id
                            ? 'bg-gradient-to-l from-brand-600 to-violet-600 text-white shadow-glow'
                            : 'hover:bg-brand-50 hover:text-brand-700 text-slate-700'
                        }`}
                      >
                        فصل {toPersianDigits(ch.number)}: {ch.title}
                      </button>
                      {ch.id === currentChapter.id && (
                        <div className="pr-3 space-y-1 mt-1">
                          {ch.lessons.map((l) => (
                            <button
                              key={l.id}
                              onClick={() => {
                                setSelectedLessonId(l.id);
                                learner.updateLastVisited(ch.id, l.id);
                              }}
                              className={`w-full text-right px-3 py-2 rounded-lg text-xs transition-all duration-fast ${
                                l.id === currentLesson.id ? 'bg-brand-50 text-brand-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {state.completedLessonIds.includes(l.id) ? '✓ ' : '• '}
                              {l.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </aside>

              <section className="lg:col-span-3 space-y-6">
                <div className="card p-6 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-600">
                    <span className="w-6 h-6 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-black text-[11px]" aria-hidden="true">{toPersianDigits(currentChapter.number)}</span>
                    فصل {toPersianDigits(currentChapter.number)} — {currentChapter.title}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{currentLesson.title}</h2>
                  <p className="text-sm text-slate-600 leading-relaxed">{currentLesson.summary}</p>

                  {currentLesson.formulaBox && (
                    <div className="relative bg-brand-50/70 border border-brand-200 rounded-2xl p-4 pr-5 text-sm font-bold text-brand-900 leading-relaxed overflow-hidden">
                      <span className="absolute top-0 bottom-0 right-0 w-1.5 bg-gradient-to-b from-brand-500 to-violet-500" aria-hidden="true" />
                      رابطهٔ کلیدی: <span className="math-expr ltr-nums">{currentLesson.formulaBox}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="font-bold text-sm text-slate-800">مراحل یادگیری مفهومی:</h3>
                    <ul className="space-y-2.5 text-sm text-slate-700">
                      {currentLesson.conceptSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5 bg-slate-50/60 rounded-xl p-2.5">
                          <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-white text-xs font-black flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
                            {toPersianDigits(i + 1)}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {currentLesson.interactiveLab === 'coordinate' && <CoordinateLab />}
                  {currentLesson.interactiveLab === 'fraction' && <FractionLab />}
                  {currentLesson.interactiveLab === 'cylinder' && <CylinderLab />}
                  {currentLesson.interactiveLab === 'percentage' && <PercentageLab />}

                  {/* دستیار آموزشی قاعده‌مند — متناسب با وضعیت مهارت این درس */}
                  <AssistantPanel
                    lessonId={currentLesson.id}
                    skillState={
                      learner.skillIdForLesson(currentLesson.id)
                        ? learner.skillStates[learner.skillIdForLesson(currentLesson.id)!]
                        : undefined
                    }
                  />

                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-sm text-slate-800">مثال حل‌شده گام‌به‌گام:</h3>
                    {currentLesson.workedExamples.map((ex) => (
                      <div key={ex.id} className="card p-4 space-y-2.5 border-r-4 border-r-brand-400">
                        <div className="font-bold text-sm text-slate-900">پرسش: <span className="math-expr">{ex.problem}</span></div>
                        <div className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
                          {ex.steps.map((s, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-brand-100 text-brand-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{toPersianDigits(idx + 1)}</span>
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="text-xs font-bold text-emerald-700 pt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          پاسخ نهایی: <span className="math-expr">{ex.finalAnswer}</span>
                        </div>
                        <div className="text-xs text-sun-700 bg-sun-50 p-3 rounded-xl border border-sun-200 leading-relaxed flex items-start gap-1.5">
                          <Star className="w-3.5 h-3.5 text-sun-500 shrink-0 mt-0.5 fill-sun-400" aria-hidden="true" />
                          <span><strong>نکتهٔ طلایی:</strong> {ex.conceptualTip}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  {(() => {
                    const flow = flowForLesson(currentLesson.id);
                    if (flow && flowMode) {
                      return (
                        <div className="space-y-4">
                          <h3 className="font-black text-base text-slate-900">{flow.title}</h3>
                          <LessonFlowPlayer
                            flow={flow}
                            questionsById={allQuestionsById}
                            onRecordAnswer={(q, answer, hints, source) => learner.recordAttempt(q, answer, hints, source)}
                            skillStates={learner.skillStates}
                            startStageIndex={learner.state.flowProgress?.[flow.id]}
                            onStagePersist={(idx) => learner.setFlowStage(flow.id, idx)}
                            onExit={() => setFlowMode(false)}
                          />
                        </div>
                      );
                    }
                    return (
                      <>
                        <h3 className="font-black text-base text-slate-900">تمرین‌های تعاملی سطح‌بندی‌شده</h3>
                        {flow && (
                          <button
                            type="button"
                            onClick={() => setFlowMode(true)}
                            className="btn-brand w-full py-4 text-sm font-black animate-pulse-soft"
                            data-testid="start-flow-btn"
                          >
                            <ListChecks className="w-5 h-5" />
                            شروع مسیر یادگیری کامل این درس (سنجش پیش‌نیاز تا سنجش انتقال)
                          </button>
                        )}
                        {currentLesson.questions.length === 0 ? (
                          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-6 text-center">
                            برای این درس هنوز تمرینی ثبت نشده است.
                          </p>
                        ) : (
                          currentLesson.questions.map((q, idx) => (
                            <QuestionCard
                              key={q.id}
                              question={q}
                              index={idx}
                              onSubmit={(answer, hintsUsed) => learner.recordAttempt(q, answer, hintsUsed, 'practice')}
                            />
                          ))
                        )}
                      </>
                    );
                  })()}
                </div>
              </section>
            </div>
          )}

          {/* ================= آزمون ================= */}
          {activeTab === 'exam' && (
            <div className="space-y-6 animate-rise">
              {examPhase === 'setup' && (
                <div className="card p-6 space-y-5">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      <span className="w-9 h-9 rounded-xl bg-sun-100 flex items-center justify-center" aria-hidden="true">
                        <Award className="w-5 h-5 text-sun-600" />
                      </span>
                      آزمون‌های موضوعی و جامع
                    </h2>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      آزمون موضوعی یک فصل یا آزمون جامع کل کتاب را انتخاب کن. پاسخ‌ها همان لحظه تصحیح می‌شوند و در پایان نمره و تحلیل اشتباهات را می‌بینی.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <button
                      onClick={() => startExam(null)}
                      className="card card-hover p-4 border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-violet-50 hover:border-brand-500 text-right"
                    >
                      <div className="font-black text-sm text-brand-900">آزمون جامع کل کتاب</div>
                      <div className="text-xs text-brand-700 mt-1">{toPersianDigits(totalQuestions)} پرسش از هر ۷ فصل</div>
                    </button>
                    {CURRICULUM_CHAPTERS.map((ch) => (
                      <button
                        key={ch.id}
                        onClick={() => startExam(ch.id)}
                        className="card card-hover p-4 border-2 border-slate-200 bg-white hover:border-brand-400 text-right"
                      >
                        <div className="font-black text-sm text-slate-900">فصل {toPersianDigits(ch.number)}: {ch.title}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {toPersianDigits(ch.lessons.reduce((a, l) => a + l.questions.length, 0))} پرسش
                        </div>
                      </button>
                    ))}
                  </div>
                  {learner.wrongQuestionIds.length > 0 && (
                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-rose-800 font-bold">
                        تو {toPersianDigits(learner.wrongQuestionIds.length)} پرسش را تاکنون اشتباه پاسخ داده‌ای. مرور آن‌ها تمرین خوبی است!
                      </p>
                    </div>
                  )}
                </div>
              )}

              {examPhase === 'running' && (
                <div className="space-y-4">
                  <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-black text-slate-900">
                        {examChapterId === null
                          ? 'آزمون جامع کل کتاب'
                          : `آزمون موضوعی — فصل ${toPersianDigits(CURRICULUM_CHAPTERS.find((c) => c.id === examChapterId)?.number ?? 0)}`}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {toPersianDigits(Object.keys(examAnswers).length)} از {toPersianDigits(examQuestions.length)} پرسش پاسخ داده شده
                      </p>
                    </div>
                    <button
                      onClick={() => setExamPhase('result')}
                      className="btn-brand"
                    >
                      <ListChecks className="w-4 h-4" aria-hidden="true" />
                      پایان آزمون و محاسبه نمره
                    </button>
                  </div>
                  {examQuestions.map((q, idx) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      index={idx}
                      onSubmit={(answer, hintsUsed) => handleExamSubmit(q, answer, hintsUsed)}
                    />
                  ))}
                </div>
              )}

              {examPhase === 'result' && (
                <div className="space-y-6">
                  <div className="card p-6 space-y-4">
                    <h2 className="text-lg font-black text-slate-900">نتیجه آزمون</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-50 to-violet-50 border border-brand-200 text-center shadow-soft animate-pop">
                        <div className="text-2xl font-black text-brand-900">٪{toPersianDigits(examScore.percent)}</div>
                        <div className="text-[11px] text-brand-600 font-bold mt-1">درصد کل</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center shadow-soft animate-pop" style={{ animationDelay: '80ms' }}>
                        <div className="text-2xl font-black text-emerald-900">{toPersianDigits(examScore.correct)}</div>
                        <div className="text-[11px] text-emerald-600 font-bold mt-1">پاسخ درست</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-center shadow-soft animate-pop" style={{ animationDelay: '160ms' }}>
                        <div className="text-2xl font-black text-rose-900">{toPersianDigits(examScore.wrong)}</div>
                        <div className="text-[11px] text-rose-600 font-bold mt-1">پاسخ نادرست</div>
                      </div>
                      <div className="p-4 rounded-2xl bg-sun-50 border border-sun-200 text-center shadow-soft animate-pop" style={{ animationDelay: '240ms' }}>
                        <div className="text-2xl font-black text-sun-700">{toPersianDigits(examScore.unanswered)}</div>
                        <div className="text-[11px] text-sun-600 font-bold mt-1">بی‌پاسخ</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <CheckCircle2 className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" aria-hidden="true" />
                      <div className="text-sm text-slate-800 font-bold">{examBandLabel(examScore.band)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setExamPhase('setup')}
                        className="btn-ghost"
                      >
                        آزمون جدید
                      </button>
                      {examScore.wrong > 0 && (
                        <button
                          onClick={retryWrongOnly}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-base ease-spring shadow-soft"
                        >
                          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                          تمرین مجدد فقط سؤال‌های غلط ({toPersianDigits(examScore.wrong)})
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-black text-base text-slate-900">مرور پاسخ‌ها با توضیح</h3>
                    {examQuestions.map((q, idx) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        index={idx}
                        locked
                        lockedAnswer={examAnswers[q.id]}
                        showCorrectOnLock
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================= گزارش پیشرفت ================= */}
          {activeTab === 'analytics' && (
            <div className="space-y-6 animate-rise">
              <div className="card p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-lg font-black text-slate-900">گزارش تحلیلی پیشرفت و تشخیص خطاها</h2>
                  <button
                    onClick={() => {
                      if (window.confirm('همه داده‌های پیشرفت از این دستگاه پاک شود؟')) {
                        learner.resetProgress();
                      }
                    }}
                    className="flex items-center gap-1 text-xs text-rose-600 font-bold hover:underline"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>بازنشانی داده‌های پیشرفت</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-soft">
                    <div className="text-xs text-slate-500 font-medium">کل تلاش‌ها</div>
                    <div className="text-xl font-black text-slate-900 mt-1">{toPersianDigits(state.attempts.length)}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-soft">
                    <div className="text-xs text-emerald-700 font-medium">پاسخ‌های درست</div>
                    <div className="text-xl font-black text-emerald-900 mt-1">
                      {toPersianDigits(state.attempts.filter((a) => a.isCorrect).length)}
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-sun-50 border border-sun-200 shadow-soft">
                    <div className="text-xs text-sun-700 font-medium">میانگین تسلط کل کتاب</div>
                    <div className="text-xl font-black text-sun-700 mt-1">٪{toPersianDigits(learner.overallMastery)}</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-orange-50 border border-orange-200 shadow-soft">
                    <div className="text-xs text-orange-700 font-medium">درس‌های تکمیل‌شده</div>
                    <div className="text-xl font-black text-orange-900 mt-1">{toPersianDigits(state.completedLessonIds.length)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">تسلط فصل به فصل:</h3>
                  {learner.masteryList.map((m) => {
                    const ch = CURRICULUM_CHAPTERS.find((c) => c.id === m.chapterId);
                    const colors = colorMap[ch?.color ?? 'indigo'] ?? colorMap.indigo;
                    const statusLabel =
                      m.status === 'mastered' ? 'تسلط کامل' : m.status === 'good' ? 'خوب' : m.status === 'needspractice' ? 'نیازمند تمرین' : 'شروع نشده';
                    return (
                      <div key={m.chapterId} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-600 w-40 sm:w-56 truncate">
                          فصل {toPersianDigits(ch?.number ?? 0)}: {ch?.title}
                        </span>
                        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner" role="progressbar" aria-valuenow={m.masteryPercent} aria-valuemin={0} aria-valuemax={100}>
                          <div className={`h-full ${colors.bar} transition-all duration-slow ease-glide`} style={{ width: `${m.masteryPercent}%` }} />
                        </div>
                        <span className={`text-xs font-bold w-28 text-left ${colors.text}`}>
                          ٪{toPersianDigits(m.masteryPercent)} — {statusLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">اشتباهات اخیر و توصیه جبرانی:</h3>
                  {learner.recentMisconceptions.length === 0 ? (
                    <p className="text-xs text-slate-500">هنوز خطای تشخیص‌داده‌شده‌ای ثبت نشده است. با حل تمرین‌ها، تحلیل هوشمند در این بخش نمایش داده می‌شود.</p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {learner.recentMisconceptions.map((att) => {
                        const ch = CURRICULUM_CHAPTERS.find((c) => c.id === att.chapterId);
                        return (
                          <li key={att.id} className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed">
                            <strong>فصل {toPersianDigits(ch?.number ?? 0)}:</strong> {att.diagnosedMisconception}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">گزارش والد/مربی — وضعیت مهارت‌به‌مهارت:</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    تمرکز این گزارش بر تسلط واقعی، خطاهای پرتکرار و پیشنهاد حمایتی است، نه زمان حضور در برنامه.
                    «اطمینان سامانه» نشان می‌دهد شواهد چقدر برای قضاوت کافی بوده‌اند.
                  </p>
                  <ParentSkillReport skillStates={learner.skillStates} />
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900">پشتیبان‌گیری داده‌ها (فقط روی همین دستگاه ذخیره می‌شود):</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={exportBackup}
                      className="btn-ghost"
                    >
                      <Download className="w-3.5 h-3.5" aria-hidden="true" />
                      دانلود فایل پشتیبان (JSON)
                    </button>
                    <label className="btn-ghost cursor-pointer">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      بازیابی از فایل پشتیبان
                      <input
                        type="file"
                        accept="application/json,.json"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) importBackup(f);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                  {importStatus && <p className="text-xs text-slate-500">{importStatus}</p>}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-bold text-sm text-slate-900 mb-2">حریم خصوصی</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  همه پیشرفت تو فقط روی دستگاه خودت (حافظه مرورگر) ذخیره می‌شود. هیچ داده‌ای به هیچ سروری ارسال نمی‌شود، ثبت‌نامی وجود ندارد و برنامه بدون اینترنت هم کار می‌کند.
                </p>
              </div>
            </div>
          )}
        </main>

        <footer className="mt-4 border-t border-brand-100 bg-white/70 backdrop-blur-sm py-5">
          <div className="max-w-6xl mx-auto px-4 text-center text-[11px] text-slate-400 font-medium flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gradient-to-l from-brand-500 to-violet-500" aria-hidden="true" />
            ریاضی‌یار ششم — پروژه آموزشی متن‌باز برای دانش‌آموزان پایه ششم ابتدایی ایران
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
};

export default App;
