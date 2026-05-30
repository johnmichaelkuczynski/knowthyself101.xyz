import React from "react";
import { useGetCourseOverview } from "@workspace/api-client-react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";

export default function Lectures() {
  const { data: overview, isLoading } = useGetCourseOverview();

  return (
    <Layout>
      <div className="p-8 max-w-4xl mx-auto w-full flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-serif font-bold text-primary mb-2">Lectures</h1>
          <p className="text-muted-foreground">
            Twenty-nine short lectures across four weeks. Read one, sit with its question, then answer honestly.
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {overview?.weeks.map((week) => (
              <div key={week.weekNumber} className="flex flex-col gap-4">
                <div className="border-b pb-2">
                  <h2 className="text-2xl font-serif font-semibold">
                    Week {week.weekNumber}: {week.title}
                  </h2>
                  {week.summary && (
                    <p className="text-sm text-muted-foreground mt-1">{week.summary}</p>
                  )}
                </div>
                {week.lectures.length === 0 ? (
                  <div className="text-muted-foreground">No lectures for this week.</div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {week.lectures.map((lecture) => (
                      <Link key={lecture.id} href={`/lectures/${lecture.id}`}>
                        <Card className="hover:border-primary/50 transition-colors cursor-pointer shadow-sm">
                          <CardContent className="p-4 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                              <BookOpen className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-lg">{lecture.title}</span>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
