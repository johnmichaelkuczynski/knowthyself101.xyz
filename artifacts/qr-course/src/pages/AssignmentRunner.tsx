import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { useParams, Link, useSearch, useLocation } from "wouter";
import { 
  useGetAssignment, 
  useStartAssignmentAttempt, 
  useGetAttempt, 
  useSaveAnswer, 
  useSubmitAttempt,
  useReanalyzeAttempt,
  useGetSettings,
  AttemptResult,
  KeystrokeTrace
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerInput } from "@/components/AnswerInput";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RebuttalThreadView } from "@/components/RebuttalThreadView";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MODE_OPTIONS, frameworksFor, lensStamp, type Mode } from "@/lib/lens";

type ReviewItem = {
  problemId: number;
  userAnswer: string;
  explanation: string;
  aiFlagged: boolean;
  rationale: string;
};

export default function AssignmentRunner() {
  const params = useParams();
  const assignmentId = Number(params.id);
  const search = useSearch();
  const [, navigate] = useLocation();

  const reviewAttemptId = (() => {
    const r = new URLSearchParams(search).get("review");
    const n = r ? Number(r) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

  const { data: assignment, isLoading: isLoadingAssignment } = useGetAssignment(assignmentId);
  const startAttempt = useStartAssignmentAttempt();
  const submitAttempt = useSubmitAttempt();
  
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const { data: attempt } = useGetAttempt(attemptId || 0, {
    query: { enabled: !!attemptId, queryKey: ['attempt', attemptId] }
  });
  
  const saveAnswer = useSaveAnswer();

  const [currentProblemIdx, setCurrentProblemIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);

  const isReview = reviewAttemptId != null && !result;
  // The attempt being reviewed: the live one just submitted, or the saved one
  // reopened for review. Push-back is keyed off this.
  const effectiveAttemptId = attemptId ?? reviewAttemptId ?? null;

  // --- Re-read through a different lens (ephemeral preview) ---
  // On the review screen the student can re-run their already-submitted answers
  // through any mode + framework to see what the app WOULD have said. This never
  // overwrites the saved feedback or touches their global Lens setting.
  const { data: settings } = useGetSettings();
  const reanalyze = useReanalyzeAttempt();
  const [previewMode, setPreviewMode] = useState<Mode | null>(null);
  const [previewFramework, setPreviewFramework] = useState<string>("auto");
  const [previewItems, setPreviewItems] = useState<Record<number, string> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Monotonic token so a slow earlier response can't overwrite a newer lens choice.
  const previewReqRef = useRef(0);

  // Seed the picker from the current global lens once settings load.
  useEffect(() => {
    if (settings && previewMode === null) {
      const m = settings.mode as Mode;
      setPreviewMode(m);
      setPreviewFramework(m === "career" ? settings.careerFramework : settings.selfFramework);
    }
  }, [settings, previewMode]);

  const runReanalyze = (mode: Mode, framework: string) => {
    if (!attemptId) return;
    setPreviewError(null);
    const token = ++previewReqRef.current;
    reanalyze.mutate(
      { attemptId, data: { mode, framework } },
      {
        onSuccess: (data) => {
          // Ignore a response that a newer lens choice has already superseded.
          if (token !== previewReqRef.current) return;
          const map: Record<number, string> = {};
          data.items.forEach((it) => {
            map[it.problemId] = it.explanation;
          });
          setPreviewItems(map);
        },
        onError: () => {
          if (token !== previewReqRef.current) return;
          // Fall back to the saved reading so the feedback never mismatches the picker.
          setPreviewItems(null);
          setPreviewError("Couldn't re-read these reflections just now — please try again.");
        },
      },
    );
  };

  const handlePreviewMode = (next: Mode) => {
    setPreviewMode(next);
    setPreviewFramework("auto");
    runReanalyze(next, "auto");
  };

  const handlePreviewFramework = (next: string) => {
    setPreviewFramework(next);
    if (previewMode) runReanalyze(previewMode, next);
  };

  const showSavedReading = () => {
    setPreviewItems(null);
    setPreviewError(null);
  };

  // In review mode, load the requested (submitted) attempt without starting a new one.
  useEffect(() => {
    if (reviewAttemptId) {
      setAttemptId(reviewAttemptId);
    }
  }, [reviewAttemptId]);

  // Otherwise resume/start a working attempt for answering.
  useEffect(() => {
    if (assignmentId && !attemptId && !startAttempt.isPending && !result && !reviewAttemptId) {
      startAttempt.mutate({ assignmentId }, {
        onSuccess: (data) => {
          setAttemptId(data.id);
          const initialAnswers: Record<number, string> = {};
          data.answers.forEach(a => {
            initialAnswers[a.problemId] = a.answer;
          });
          setAnswers(initialAnswers);
        }
      });
    }
  }, [assignmentId, attemptId, startAttempt, result, reviewAttemptId]);

  const handleAnswerChange = (problemId: number, val: string, trace: KeystrokeTrace) => {
    setAnswers(prev => ({ ...prev, [problemId]: val }));
    if (attemptId) {
      saveAnswer.mutate({
        attemptId,
        data: { problemId, answer: val, trace }
      });
    }
  };

  const handleSubmit = () => {
    if (!attemptId) return;
    submitAttempt.mutate({ attemptId }, {
      onSuccess: (data) => {
        setResult(data);
      }
    });
  };

  const handleRetake = () => {
    setResult(null);
    setAttemptId(null);
    setAnswers({});
    setCurrentProblemIdx(0);
    navigate(`/assignments/${assignmentId}`);
  };

  if (isLoadingAssignment || !assignment) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  // Build a unified review list from either a just-submitted result or a loaded past attempt.
  let reviewData: ReviewItem[] | null = null;
  if (result) {
    reviewData = result.perProblem.map((pr) => {
      const det = result.detection.find((d) => d.problemId === pr.problemId);
      const preview = previewItems?.[pr.problemId];
      return {
        problemId: pr.problemId,
        userAnswer: pr.userAnswer ?? "",
        explanation: preview !== undefined ? preview : pr.explanation,
        aiFlagged: det?.aiFlagged ?? false,
        rationale: det?.rationale ?? "",
      };
    });
  } else if (isReview && attempt) {
    reviewData = assignment.problems.map((p) => {
      const ans = attempt.answers.find((a) => a.problemId === p.id);
      const preview = previewItems?.[p.id];
      return {
        problemId: p.id,
        userAnswer: ans?.answer ?? "",
        explanation: preview !== undefined ? preview : (ans?.explanation ?? ""),
        aiFlagged: ans?.aiFlagged ?? false,
        rationale: ans?.detectionRationale ?? "",
      };
    });
  }

  // Review is requested but the attempt is still loading.
  if (isReview && !reviewData) {
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (reviewData) {
    const answeredCount = reviewData.filter((r) => r.userAnswer.trim().length > 0).length;
    return (
      <Layout>
        <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-primary mb-2">{assignment.title} — Reflections</h1>
              <p className="text-muted-foreground">
                You answered {answeredCount} {answeredCount === 1 ? "prompt" : "prompts"}. Each was read for depth and honesty — here's what your words reveal, and where they fall short.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={handleRetake}>Retake</Button>
              <Link href={`/assignments`}>
                <Button>Back to Assignments</Button>
              </Link>
            </div>
          </div>

          {previewMode && (
            <div className="rounded-lg border border-border bg-secondary/40 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                  Re-read through
                </span>
                <Select
                  value={previewMode}
                  onValueChange={(v) => handlePreviewMode(v as Mode)}
                  disabled={reanalyze.isPending}
                >
                  <SelectTrigger className="h-9 w-[150px] text-sm" data-testid="select-preview-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={previewFramework}
                  onValueChange={handlePreviewFramework}
                  disabled={reanalyze.isPending}
                >
                  <SelectTrigger className="h-9 w-[220px] text-sm" data-testid="select-preview-framework">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {frameworksFor(previewMode).map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reanalyze.isPending && (
                  <span className="text-sm text-muted-foreground animate-pulse">Re-reading…</span>
                )}
                {previewItems && !reanalyze.isPending && (
                  <Button
                    variant="outline"
                    className="h-9 text-xs"
                    onClick={showSavedReading}
                    data-testid="button-show-saved"
                  >
                    Show saved reading
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                See what these same answers reveal through another lens. This is a preview — it
                doesn't change your saved feedback or your global Lens setting.
              </p>
              {previewItems && !reanalyze.isPending && (
                <p className="text-sm" data-testid="text-preview-stamp">
                  Previewing through <strong>{lensStamp(previewMode, previewFramework)}</strong>.
                </p>
              )}
              {previewError && <p className="text-sm text-destructive">{previewError}</p>}
            </div>
          )}

          <div className="flex flex-col gap-6">
            {reviewData.map((pr, idx) => (
              <div key={pr.problemId} className="p-6 rounded-lg border border-border bg-card">
                <h3 className="font-medium mb-2">Reflection {idx + 1}</h3>
                <div className="mb-4">
                  <span className="text-sm font-semibold">What you wrote:</span>
                  <div className="mt-1 whitespace-pre-wrap">{pr.userAnswer || "No answer"}</div>
                </div>
                {pr.explanation && (
                  <div>
                    <span className="text-sm font-semibold">What it reveals:</span>
                    <div className="mt-1 text-sm"><MarkdownRenderer content={pr.explanation} /></div>
                  </div>
                )}
                
                {pr.aiFlagged && (
                  <div className="mt-4 p-3 bg-secondary rounded-md text-sm border border-secondary-border">
                    <strong className="text-chart-4">This reads as if it may not be in your own words.</strong>
                    <p className="text-muted-foreground mt-1">The point of this course is to hear from you. {pr.rationale}</p>
                  </div>
                )}

                {effectiveAttemptId && pr.userAnswer.trim().length > 0 && pr.explanation && (
                  <RebuttalThreadView attemptId={effectiveAttemptId} problemId={pr.problemId} />
                )}
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const currentProblem = assignment.problems[currentProblemIdx];

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-6 pb-24">
        <Link href="/assignments" className="text-sm text-muted-foreground hover:text-primary w-fit">
          ← Back to Assignments
        </Link>
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-primary">{assignment.title}</h1>
            <p className="text-sm text-muted-foreground">Problem {currentProblemIdx + 1} of {assignment.problems.length}</p>
          </div>
          {attempt?.deadlineAt && (
            <div className="text-destructive font-mono font-bold px-3 py-1 rounded bg-destructive/10 border border-destructive/20">
              Deadline: {new Date(attempt.deadlineAt).toLocaleTimeString()}
            </div>
          )}
        </div>

        {currentProblem ? (
          <div className="flex flex-col gap-8">
            <div className="prose prose-slate dark:prose-invert max-w-none text-lg">
              <MarkdownRenderer content={currentProblem.prompt} />
            </div>
            
            <div className="flex flex-col gap-4">
              <AnswerInput 
                value={answers[currentProblem.id] || ""}
                onChange={(val, trace) => handleAnswerChange(currentProblem.id, val, trace)}
                promptSource={currentProblem.prompt}
              />
            </div>

            <div className="flex justify-between mt-8 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setCurrentProblemIdx(p => Math.max(0, p - 1))}
                disabled={currentProblemIdx === 0}
              >
                Previous
              </Button>
              
              {currentProblemIdx < assignment.problems.length - 1 ? (
                <Button 
                  onClick={() => setCurrentProblemIdx(p => Math.min(assignment.problems.length - 1, p + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit}
                  className="bg-chart-2 hover:bg-chart-2/90 text-white"
                  disabled={submitAttempt.isPending}
                >
                  {submitAttempt.isPending ? "Submitting..." : "Submit Assignment"}
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div>Problem not found.</div>
        )}
      </div>
    </Layout>
  );
}
