import React, { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetAnalyticsSummary, 
  useGetTopicAnalytics, 
  useGetRecentActivity,
  useGenerateReport,
  useGetSettings,
  useGetLatestReport,
  getGetLatestReportQueryKey,
  getGetReportHistoryQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { lensStamp, type Mode } from "@/lib/lens";
import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";

export default function Analytics() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAnalyticsSummary();
  const { data: topics, isLoading: isLoadingTopics } = useGetTopicAnalytics();
  const { data: activity, isLoading: isLoadingActivity } = useGetRecentActivity();
  const generateReport = useGenerateReport();
  const { data: settings } = useGetSettings();
  const { data: latest } = useGetLatestReport();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const [report, setReport] = useState<any>(null);

  const isCareer = settings?.mode === "career";
  const activeFrameworkId = isCareer
    ? settings?.careerFramework
    : settings?.selfFramework;
  const lensLabel = settings
    ? lensStamp(settings.mode as Mode, activeFrameworkId ?? "auto", settings.stance)
    : null;

  // A freshly generated report is held in local state for this session; it is
  // lens-specific, so if the mode OR framework changes, drop it so old narrative
  // text never shows under the new mode's headings or a mismatched lens badge.
  useEffect(() => {
    setReport(null);
  }, [settings?.mode, activeFrameworkId]);

  // The persisted profile: the latest saved reading for the current mode, loaded on
  // mount so the portrait survives between visits. The endpoint is mode-scoped, but
  // its query key is static, so guard by mode to avoid flashing the other mode's
  // reading during a refetch after a mode switch.
  const persisted =
    latest?.report && latest.report.mode === settings?.mode ? latest.report : null;
  const effectiveReport = report ?? persisted;
  const reportTitle = isCareer ? "Your Career Reading" : "Your Self-Portrait";
  const reportSubtitle = isCareer
    ? "An evolving read on the work that fits you, drawn from everything you've written so far."
    : "An evolving picture of you, drawn from everything you've written so far.";
  const reportButtonLabel = isCareer ? "Update My Career Reading" : "Update My Self-Portrait";
  const patternsLabel = isCareer ? "Signals I noticed" : "Patterns I noticed";
  const tensionsLabel = isCareer ? "Mismatches worth weighing" : "Tensions worth sitting with";
  const questionsLabel = isCareer ? "Questions to sharpen direction" : "Questions to carry forward";

  const handleGenerateReport = () => {
    generateReport.mutate(undefined, {
      onSuccess: (data) => {
        setReport(data);
        // The generation persisted a new snapshot server-side; refresh the saved
        // profile + its history so they reflect the latest reading.
        queryClient.invalidateQueries({ queryKey: getGetLatestReportQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetReportHistoryQueryKey() });
      },
    });
  };

  return (
    <Layout>
      <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-8 pb-24">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-primary mb-2">{reportTitle}</h1>
            <p className="text-muted-foreground">{reportSubtitle}</p>
          </div>
          <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
            {generateReport.isPending ? "Reflecting..." : reportButtonLabel}
          </Button>
        </div>

        {effectiveReport && (
          <Card className="border-primary bg-primary/5">
            <CardHeader>
              <CardTitle>{reportTitle}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Drawn {new Date(effectiveReport.generatedAt).toLocaleString()}</span>
                {lensLabel && (
                  <span
                    className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold uppercase tracking-wider"
                    data-testid="report-lens-badge"
                  >
                    {lensLabel}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <div>
                <MarkdownRenderer content={effectiveReport.narrative} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-chart-2 mb-2">{patternsLabel}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {effectiveReport.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-chart-4 mb-2">{tensionsLabel}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {effectiveReport.weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>
              {Array.isArray(effectiveReport.recommendations) && effectiveReport.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold text-primary mb-2">{questionsLabel}</h4>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    {effectiveReport.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard title="Depth Read" value={summary?.officialAverage ? `${summary.officialAverage}%` : '-'} loading={isLoadingSummary} />
          <StatCard title="Practice Depth" value={summary?.practiceAccuracy ? `${summary.practiceAccuracy}%` : '-'} loading={isLoadingSummary} />
          <StatCard title="Assignments" value={summary?.attemptsCount} loading={isLoadingSummary} />
          <StatCard title="Reflections" value={summary?.practiceCount} loading={isLoadingSummary} />
          <StatCard title="Streak (Days)" value={summary?.streakDays} loading={isLoadingSummary} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 flex flex-col gap-4">
            <h2 className="text-xl font-serif font-semibold">Topic Mastery</h2>
            <Card>
              <CardContent className="p-0">
                {isLoadingTopics ? <Skeleton className="h-64 w-full" /> : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-secondary/50 text-muted-foreground text-left">
                        <tr>
                          <th className="p-3 font-medium">Topic</th>
                          <th className="p-3 font-medium">Week</th>
                          <th className="p-3 font-medium text-right">Reflections</th>
                          <th className="p-3 font-medium text-right">Depth</th>
                          <th className="p-3 font-medium text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {topics?.map(topic => (
                          <tr
                            key={topic.topicId}
                            onClick={() => setLocation(`/practice/topic/${topic.topicId}`)}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            title={`Practice "${topic.topicTitle}" at a difficulty matched to your performance`}
                            data-testid={`row-topic-${topic.topicId}`}
                          >
                            <td className="p-3 font-medium">
                              <div className="flex items-center gap-1 group-hover:text-primary transition-colors">
                                <span>{topic.topicTitle}</span>
                                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            </td>
                            <td className="p-3 text-muted-foreground">Week {topic.weekNumber}</td>
                            <td className="p-3 text-right">{topic.attempts}</td>
                            <td className="p-3 text-right font-mono">{topic.accuracy}%</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider
                                ${topic.strengthLabel === 'strong' ? 'bg-chart-2/20 text-chart-2' :
                                  topic.strengthLabel === 'weak' ? 'bg-destructive/20 text-destructive' :
                                  topic.strengthLabel === 'developing' ? 'bg-chart-4/20 text-chart-4' :
                                  'bg-secondary text-secondary-foreground'
                                }`}>
                                {topic.strengthLabel}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-xl font-serif font-semibold">Recent Activity Timeline</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {isLoadingActivity ? <Skeleton className="h-64 w-full" /> : 
                 activity?.length === 0 ? <div className="p-6 text-center text-muted-foreground">No activity yet.</div> :
                 activity?.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div className="font-medium">{item.title}</div>
                      {item.score !== undefined && item.score !== null && (
                        <div className="font-mono text-sm font-bold bg-secondary px-2 py-0.5 rounded">{Math.round(item.score)}%</div>
                      )}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-wider font-semibold">{item.kind}</span>
                      <span>{new Date(item.at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, loading }: { title: string, value: React.ReactNode, loading: boolean }) {
  return (
    <Card>
      <CardContent className="p-4 flex flex-col justify-center items-center text-center h-24">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">{title}</div>
        {loading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-serif font-bold text-primary">{value}</div>}
      </CardContent>
    </Card>
  );
}
