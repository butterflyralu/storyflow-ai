import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, BarChart3, Users, FileText, TrendingUp, Zap, DollarSign, Activity, Calendar, ArrowUpRight } from 'lucide-react';

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

interface UsageLog {
  id: string;
  user_id: string;
  function_name: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

interface UserUsageSummary {
  userId: string;
  displayName: string;
  totalCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  byFunction: Record<string, { calls: number; tokens: number; cost: number }>;
}

export default function AdminDashboard() {
  const isAdmin = useIsAdmin();
  const [stories, setStories] = useState<GeneratedStory[]>([]);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month'>('week');

  useEffect(() => {
    if (!isAdmin) return;
    loadData();
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);

    const [storiesRes, usageRes] = await Promise.all([
      supabase
        .from('generated_stories' as any)
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('api_usage_logs' as any)
        .select('*')
        .order('created_at', { ascending: false }),
    ]);

    const storyRows = (storiesRes.data ?? []) as unknown as GeneratedStory[];
    const usageRows = (usageRes.data ?? []) as unknown as UsageLog[];
    setStories(storyRows);
    setUsageLogs(usageRows);

    // Load unique user profiles from both sources
    const userIds = [...new Set([
      ...storyRows.map(s => s.user_id),
      ...usageRows.map(u => u.user_id),
    ])];
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

  const getUserName = (userId: string) => profiles[userId]?.display_name || userId.slice(0, 8);
  const formatDate = (d: string) => new Date(d).toLocaleString();
  const formatCost = (c: number) => `$${c.toFixed(4)}`;
  const formatTokens = (t: number) => t >= 1_000_000 ? `${(t / 1_000_000).toFixed(1)}M` : t >= 1_000 ? `${(t / 1_000).toFixed(1)}K` : String(t);

  // Time period filtering
  const now = new Date();
  const periodStart = useMemo(() => {
    const d = new Date(now);
    if (timePeriod === 'week') {
      d.setDate(d.getDate() - 7);
    } else {
      d.setDate(d.getDate() - 30);
    }
    d.setHours(0, 0, 0, 0);
    return d;
  }, [timePeriod]);

  const filteredLogs = useMemo(() =>
    usageLogs.filter(l => new Date(l.created_at) >= periodStart),
    [usageLogs, periodStart]
  );

  // Usage aggregation on filtered logs
  const totalApiCalls = filteredLogs.length;
  const totalTokensAll = filteredLogs.reduce((sum, l) => sum + l.total_tokens, 0);
  const totalCostAll = filteredLogs.reduce((sum, l) => sum + Number(l.estimated_cost_usd), 0);

  // Budget forecast: extrapolate current period usage
  const forecast = useMemo(() => {
    const periodDays = timePeriod === 'week' ? 7 : 30;
    const elapsed = Math.max(1, Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)));
    const dailyRate = totalCostAll / elapsed;
    const dailyTokenRate = totalTokensAll / elapsed;
    const dailyCallRate = totalApiCalls / elapsed;

    const projectedCost = dailyRate * periodDays;
    const projectedTokens = dailyTokenRate * periodDays;
    const projectedCalls = Math.round(dailyCallRate * periodDays);

    // Also compute weekly and monthly projections
    const weeklyForecast = dailyRate * 7;
    const monthlyForecast = dailyRate * 30;

    return { projectedCost, projectedTokens, projectedCalls, weeklyForecast, monthlyForecast, dailyRate };
  }, [totalCostAll, totalTokensAll, totalApiCalls, periodStart, timePeriod]);

  const userUsageSummaries: UserUsageSummary[] = useMemo(() => {
    const map: Record<string, UserUsageSummary> = {};
    filteredLogs.forEach(log => {
      if (!map[log.user_id]) {
        map[log.user_id] = {
          userId: log.user_id,
          displayName: profiles[log.user_id]?.display_name || log.user_id.slice(0, 8),
          totalCalls: 0,
          totalTokens: 0,
          promptTokens: 0,
          completionTokens: 0,
          estimatedCost: 0,
          byFunction: {},
        };
      }
      const u = map[log.user_id];
      u.totalCalls++;
      u.totalTokens += log.total_tokens;
      u.promptTokens += log.prompt_tokens;
      u.completionTokens += log.completion_tokens;
      u.estimatedCost += Number(log.estimated_cost_usd);
      if (!u.byFunction[log.function_name]) {
        u.byFunction[log.function_name] = { calls: 0, tokens: 0, cost: 0 };
      }
      u.byFunction[log.function_name].calls++;
      u.byFunction[log.function_name].tokens += log.total_tokens;
      u.byFunction[log.function_name].cost += Number(log.estimated_cost_usd);
    });
    Object.values(map).forEach(u => {
      u.displayName = profiles[u.userId]?.display_name || u.userId.slice(0, 8);
    });
    return Object.values(map).sort((a, b) => b.estimatedCost - a.estimatedCost);
  }, [filteredLogs, profiles]);

  // Group usage by day/week for the chart
  const groupedUsage = useMemo(() => {
    const groups: Record<string, { calls: number; tokens: number; cost: number }> = {};
    filteredLogs.forEach(log => {
      const day = log.created_at.slice(0, 10);
      if (!groups[day]) groups[day] = { calls: 0, tokens: 0, cost: 0 };
      groups[day].calls++;
      groups[day].tokens += log.total_tokens;
      groups[day].cost += Number(log.estimated_cost_usd);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredLogs]);

  // (helpers moved above early return)

  return (
    <div className="min-h-screen bg-background p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">AI quality metrics & API usage monitoring</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs defaultValue="quality" className="space-y-6">
          <TabsList>
            <TabsTrigger value="quality" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              AI Quality
            </TabsTrigger>
            <TabsTrigger value="usage" className="gap-2">
              <Activity className="h-4 w-4" />
              API Usage & Costs
            </TabsTrigger>
          </TabsList>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            {Object.keys(scorecardStats).length > 0 && (
              <Card>
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
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${rate}%` }} />
                            </div>
                            <span className="w-16 text-right text-muted-foreground text-xs">{rate}% ({total})</span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            )}

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
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Time Period Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Showing data for the last {timePeriod === 'week' ? '7 days' : '30 days'}</span>
              </div>
              <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as 'week' | 'month')}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usage Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Zap className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{totalApiCalls}</p>
                      <p className="text-xs text-muted-foreground">API Calls</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{formatTokens(totalTokensAll)}</p>
                      <p className="text-xs text-muted-foreground">Tokens Used</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{formatCost(totalCostAll)}</p>
                      <p className="text-xs text-muted-foreground">Actual Cost</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{userUsageSummaries.length}</p>
                      <p className="text-xs text-muted-foreground">Active Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Budget Forecast */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ArrowUpRight className="h-5 w-5 text-primary" />
                  Budget Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Daily Avg Cost</p>
                    <p className="text-xl font-bold">{formatCost(forecast.dailyRate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Projected Weekly</p>
                    <p className="text-xl font-bold">{formatCost(forecast.weeklyForecast)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Projected Monthly</p>
                    <p className="text-xl font-bold">{formatCost(forecast.monthlyForecast)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic">
                  Forecast extrapolated from average daily usage in the selected period.
                </p>
              </CardContent>
            </Card>

            {/* Per-User Usage Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Usage Per User ({timePeriod === 'week' ? 'This Week' : 'This Month'})</CardTitle>
              </CardHeader>
              <CardContent>
                {userUsageSummaries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">No usage data for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 pr-4 font-medium text-muted-foreground">User</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">API Calls</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">Prompt Tokens</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">Completion Tokens</th>
                          <th className="py-2 pr-4 font-medium text-muted-foreground text-right">Total Tokens</th>
                          <th className="py-2 font-medium text-muted-foreground text-right">Est. Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userUsageSummaries.map(u => (
                          <tr key={u.userId} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-3 pr-4">
                              <div className="font-medium">{u.displayName}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {Object.entries(u.byFunction).map(([fn, stats]) => (
                                  <span key={fn} className="mr-2">
                                    {fn}: {stats.calls} calls
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-right tabular-nums">{u.totalCalls}</td>
                            <td className="py-3 pr-4 text-right tabular-nums">{formatTokens(u.promptTokens)}</td>
                            <td className="py-3 pr-4 text-right tabular-nums">{formatTokens(u.completionTokens)}</td>
                            <td className="py-3 pr-4 text-right tabular-nums font-medium">{formatTokens(u.totalTokens)}</td>
                            <td className="py-3 text-right tabular-nums font-medium">{formatCost(u.estimatedCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-semibold">
                          <td className="py-3 pr-4">Total</td>
                          <td className="py-3 pr-4 text-right tabular-nums">{totalApiCalls}</td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatTokens(filteredLogs.reduce((s, l) => s + l.prompt_tokens, 0))}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {formatTokens(filteredLogs.reduce((s, l) => s + l.completion_tokens, 0))}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">{formatTokens(totalTokensAll)}</td>
                          <td className="py-3 text-right tabular-nums">{formatCost(totalCostAll)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Usage Chart */}
            {groupedUsage.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Daily Usage ({timePeriod === 'week' ? 'Last 7 Days' : 'Last 30 Days'})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {groupedUsage.map(([day, stats]) => {
                      const maxCost = Math.max(...groupedUsage.map(([, s]) => s.cost));
                      const barWidth = maxCost > 0 ? (stats.cost / maxCost) * 100 : 0;
                      return (
                        <div key={day} className="flex items-center gap-3 text-sm">
                          <span className="w-24 text-muted-foreground font-mono text-xs">{day}</span>
                          <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded-full transition-all"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs text-muted-foreground">{stats.calls} calls</span>
                          <span className="w-16 text-right text-xs font-medium">{formatCost(stats.cost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
