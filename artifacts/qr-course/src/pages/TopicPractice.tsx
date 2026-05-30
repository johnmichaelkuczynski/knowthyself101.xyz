import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useStartPracticeSession,
  useNextPracticeProblem,
  useGradePracticeAnswer,
  useGetTopicAnalytics,
  type PracticeProblem,
  type PracticeGrade,
  type KeystrokeTrace,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AnswerInput } from "@/components/AnswerInput";
import { ArrowLeft, CheckCircle2, RefreshCw } from "lucide-react";

function difficultyFromAccuracy(attempts: number, accuracy: number): {
  value: number;
  label: string;
  rationale: string;
} {
  if (attempts === 0) {
    return {
      value: 2.0,
      label: "gentle",
      rationale: "You haven't reflected on this topic yet — starting with a gentle prompt.",
    };
  }
  if (accuracy < 40) {
    return {
      value: 1.5,
      label: "very gentle",
      rationale: `You've engaged this topic lightly so far — starting with an inviting prompt.`,
    };
  }
  if (accuracy < 70) {
    return {
      value: 2.5,
      label: "gentle-deeper",
      rationale: `You've begun opening up here — starting at a comfortable depth to keep going.`,
    };
  }
  if (accuracy < 90) {
    return {
      value: 3.5,
      label: "deeper",
      rationale: `You've been candid on this topic — going a little deeper.`,
    };
  }
  return {
    value: 4.5,
    label: "searching",
    rationale: `You've reflected honestly here — moving to more searching prompts.`,
  };
}

export default function TopicPractice() {
  const params = useParams<{ topicId: string }>();
  const topicId = parseInt(params.topicId ?? "", 10);

  const { data: topics, isLoading: topicsLoading } = useGetTopicAnalytics();
  const topic = topics?.find((t) => t.topicId === topicId);

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [problem, setProblem] = useState<PracticeProblem | null>(null);
  const [answer, setAnswer] = useState("");
  const [grade, setGrade] = useState<PracticeGrade | null>(null);
  const [trace, setTrace] = useState<KeystrokeTrace>({
    keystrokeCount: 0,
    eraseCount: 0,
    durationMs: 0,
  });
  const [history, setHistory] = useState<{ correct: boolean; difficulty: number }[]>([]);

  const start = useStartPracticeSession();
  const next = useNextPracticeProblem();
  const grader = useGradePracticeAnswer();

  const tuning = useMemo(() => {
    if (!topic) return null;
    return difficultyFromAccuracy(topic.attempts, topic.accuracy);
  }, [topic]);

  useEffect(() => {
    if (sessionId != null) return;
    if (Number.isNaN(topicId)) return;
    if (topicsLoading) return;
    if (!tuning) return;
    start.mutate(
      {
        data: {
          tutorEnabled: true,
          focusOnWeaknesses: false,
          topicId,
          initialDifficulty: tuning.value,
        },
      },
      {
        onSuccess: (s) => {
          setSessionId(s.id);
          loadNext(s.id);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topicId, topicsLoading, tuning]);

  function loadNext(sid: number) {
    setAnswer("");
    setGrade(null);
    setTrace({ keystrokeCount: 0, eraseCount: 0, durationMs: 0 });
    setProblem(null);
    next.mutate(
      { sessionId: sid, data: { topicId } },
      { onSuccess: (p) => setProblem(p) },
    );
  }

  function submit() {
    if (!sessionId || !problem) return;
    grader.mutate(
      { sessionId, data: { problemId: problem.id, answer, trace } },
      {
        onSuccess: (r) => {
          setGrade(r);
          setHistory((h) => [
            ...h,
            { correct: r.correct, difficulty: problem.difficulty ?? 0 },
          ]);
        },
      },
    );
  }

  if (Number.isNaN(topicId)) {
    return (
      <Layout>
        <div className="p-8 max-w-3xl mx-auto">
          <div className="text-red-700">Invalid topic.</div>
          <Link href="/analytics" className="text-primary underline">
            Back to analytics
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-3xl mx-auto w-full flex flex-col gap-5">
        <div>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to analytics
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
            Topic practice
          </div>
          <h1 className="font-serif text-3xl">
            {topic?.topicTitle ?? (topicsLoading ? "Loading…" : `Topic ${topicId}`)}
          </h1>
          {topic && (
            <div className="text-sm text-muted-foreground">
              Week {topic.weekNumber} · {topic.attempts} prior reflection
              {topic.attempts === 1 ? "" : "s"} ·{" "}
              <span className="uppercase tracking-wider font-semibold">
                {topic.strengthLabel}
              </span>
            </div>
          )}
          {tuning && (
            <div className="mt-2 text-sm bg-secondary/60 border rounded-md p-3">
              <span className="font-semibold">Starting at {tuning.label}</span> ·{" "}
              {tuning.rationale} The depth adapts as you go — the more candid your
              reflections, the deeper the prompts become.
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-b pb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {problem?.difficulty != null && (
              <>Current difficulty {problem.difficulty.toFixed(1)}/5</>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              Reflections this session: {history.length}
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => sessionId && loadNext(sessionId)}
              disabled={next.isPending || grader.isPending || !sessionId}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              New problem
            </Button>
          </div>
        </div>

        <div className="bg-card border rounded-lg p-4 min-h-[120px]">
          {next.isPending || start.isPending || !problem ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : (
            <MarkdownRenderer content={problem.prompt} />
          )}
        </div>

        <div className="flex flex-col gap-2">
          <AnswerInput
            value={answer}
            onChange={(val, t) => {
              setAnswer(val);
              setTrace(t);
            }}
            disabled={!!grade || !problem}
            promptSource={problem?.prompt}
          />
        </div>

        {grade ? (
          <div
            className={`rounded-md border p-3 ${
              grade.correct
                ? "bg-emerald-50 border-emerald-300"
                : "bg-amber-50 border-amber-300"
            }`}
          >
            <div
              className={`flex items-center gap-2 font-semibold mb-2 ${
                grade.correct ? "text-emerald-800" : "text-amber-800"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {grade.correct ? "What this reveals" : "An invitation to go deeper"}
            </div>
            <div className="text-sm prose prose-sm max-w-none">
              <MarkdownRenderer content={grade.explanation} />
            </div>
            {grade.tutorTip && (
              <div className="mt-2 pt-2 border-t border-border/60 text-sm italic text-muted-foreground">
                Tutor tip: {grade.tutorTip}
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <Button
                onClick={() => sessionId && loadNext(sessionId)}
                disabled={next.isPending}
              >
                Next problem
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button
              onClick={submit}
              disabled={!answer.trim() || grader.isPending || !problem}
            >
              {grader.isPending ? "Grading…" : "Submit answer"}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
