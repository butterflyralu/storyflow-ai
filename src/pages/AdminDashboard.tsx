import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Loader2, CheckCircle, XCircle, BarChart3, Users, FileText, TrendingUp } from 'lucide-react';

interface GeneratedStory {
  id: string;
  user_id: string;
  context_id: string | null;
  session_id: string | null;
  title: string;
  as_a: string;
  i_want: string;
  so_that: string;
  description: string;
  acceptance_criteria: any[];
  metadata: any;
  evaluation_result: string | null;
  evaluation_scorecard: any[] | null;
  evaluation_improved_story: any | null;
  evaluation_learning_insight: any | null;
  is_likely_epic: boolean;
  created_at: string;
}

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export default function AdminDashboard() {
  const isAdmin = useIsAdmin();
  const [stories, setStories] = useState<GeneratedStory[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const { data: storiesData } = await supabase
      .from('generated_stories' as any)
      .select('*')
      .order('created_at', { ascending: false });

    const storyRows = (storiesData ?? []) as unknown as GeneratedStory[];
    setStories(storyRows);

    // Load unique user profiles
    const userIds = [...new Set(storyRows.map(s => s.user_id))];
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', userIds);
      const map: Record<string, UserProfile> = {};
      (profilesData ?? []).forEach(p => { map[p.id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  };

  if (!isAdmin) return <Navigate to="/" replace />;

  const totalStories = stories.length;
  const evaluated = stories.filter(s => s.evaluation_result);
  const passed = evaluated.filter(s => s.evaluation_result === 'PASS');
  const failed = evaluated.filter(s => s.evaluation_result === 'FAIL');
  const passRate = evaluated.length > 0 ? Math.round((passed.length / evaluated.length) * 100) : 0;
  const uniqueUsers = new Set(stories.map(s => s.user_id)).size;
  const epics = stories.filter(s => s.is_likely_epic).length;

  // Scorecard aggregation
  const scorecardStats: Record<string, { pass: number; fail: number }> = {};
  evaluated.forEach(s => {
    if (Array.isArray(s.evaluation_scorecard)) {
      s.evaluation_scorecard.forEach((item: any) => {
        const key = `${item.framework}: ${item.criterion}`;
        if (!scorecardStats[key]) scorecardStats[key] = { pass: 0, fail: 0 };
        if (item.result === 'PASS') scorecardStats[key].pass++;
        else scorecardStats[key].fail++;
      });
    }
  });

  const getUserName = (userId: string) => profiles[userId]?.display_name || userId.slice(0, 8);

  const formatDate = (d: string) => new Date(d).toLocaleString();

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">AI Quality Dashboard</h1>
        <p className="text-muted-foreground mt-1">Generated stories & evaluation metrics across all testers</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-2xl font-bold">{totalStories}</p>
                    <p className="text-xs text-muted-foreground">Total Stories</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{uniqueUsers}</p>
                    <p className="text-xs text-muted-foreground">Active Testers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{passRate}%</p>
                    <p className="text-xs text-muted-foreground">Pass Rate ({evaluated.length} evals)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                  <div>
                    <p className="text-2xl font-bold">{epics}</p>
                    <p className="text-xs text-muted-foreground">Flagged as Epics</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scorecard Breakdown */}
          {Object.keys(scorecardStats).length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="text-lg">Evaluation Criteria Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {Object.entries(scorecardStats)
                    .sort(([, a], [, b]) => (b.fail / (b.pass + b.fail)) - (a.fail / (a.pass + a.fail)))
                    .map(([criterion, stats]) => {
                      const total = stats.pass + stats.fail;
                      const rate = Math.round((stats.pass / total) * 100);
                      return (
                        <div key={criterion} className="flex items-center gap-3 text-sm">
                          <div className="w-64 truncate font-medium">{criterion}</div>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-muted-foreground text-xs">
                            {rate}% ({total})
                          </span>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stories List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Generated Stories ({totalStories})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Accordion type="multiple" className="space-y-2">
                  {stories.map(story => (
                    <AccordionItem key={story.id} value={story.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline py-3">
                        <div className="flex items-center gap-3 text-left">
                          {story.evaluation_result === 'PASS' ? (
                            <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          ) : story.evaluation_result === 'FAIL' ? (
                            <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate">{story.title || 'Untitled'}</div>
                            <div className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                              <span>{getUserName(story.user_id)}</span>
                              <span>·</span>
                              <span>{formatDate(story.created_at)}</span>
                              {story.is_likely_epic && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">Epic</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-3">
                        <div className="rounded-lg bg-muted/50 p-3 text-sm">
                          <p><strong>As a</strong> {story.as_a}</p>
                          <p><strong>I want to</strong> {story.i_want}</p>
                          <p><strong>So that</strong> {story.so_that}</p>
                        </div>
                        {story.description && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Description</div>
                            <p className="text-sm whitespace-pre-wrap">{story.description}</p>
                          </div>
                        )}
                        {Array.isArray(story.acceptance_criteria) && story.acceptance_criteria.length > 0 && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Acceptance Criteria</div>
                            {story.acceptance_criteria.map((group: any, i: number) => (
                              <div key={i} className="mb-1">
                                <span className="text-xs text-muted-foreground">{group.category}</span>
                                <ul className="list-disc list-inside text-sm">
                                  {group.items?.map((item: string, j: number) => (
                                    <li key={j}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        )}
                        {story.evaluation_scorecard && (
                          <div>
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Evaluation Scorecard</div>
                            <div className="grid gap-1">
                              {(story.evaluation_scorecard as any[]).map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  {item.result === 'PASS' ? (
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-destructive" />
                                  )}
                                  <span className="text-xs text-muted-foreground">[{item.framework}]</span>
                                  <span>{item.criterion}</span>
                                  <span className="text-xs text-muted-foreground ml-auto max-w-[40%] truncate">{item.explanation}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {story.evaluation_learning_insight && (
                          <div className="rounded-lg border p-3 text-sm">
                            <div className="text-xs font-semibold text-muted-foreground mb-1">Learning Insight</div>
                            <p><strong>Observation:</strong> {(story.evaluation_learning_insight as any).observation}</p>
                            <p><strong>Question:</strong> {(story.evaluation_learning_insight as any).question}</p>
                            <p><strong>Suggestion:</strong> {(story.evaluation_learning_insight as any).suggestion}</p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
