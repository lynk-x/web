"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';

interface Question {
    id: string;
    question_text: string;
    options: string[];
    correct: Record<string, number>;
    order_index: number;
}

interface Questionnaire {
    id: string;
    title: string;
    status: string;
    forum_channel_id: string | null;
    forum_channels?: { display_name: string } | null;
    info: { description?: string; time_limit_seconds?: number } | null;
    questions: Question[];
}

interface Response {
    id: string;
    question_id: string;
    user_id: string;
    selected_answer: number[];
    score: number;
    user_profile: { display_name: string | null } | null;
}

interface LeaderboardEntry {
    userId: string;
    displayName: string;
    totalScore: number;
    answeredCount: number;
}

interface QuestionStat {
    question: Question;
    totalResponses: number;
    distribution: { optionIndex: number; count: number; isCorrect: boolean }[];
    correctRate: number;
}

export default function QuizResultsPage() {
    const { id: quizId } = useParams<{ id: string }>();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [questionStats, setQuestionStats] = useState<QuestionStat[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [responseCount, setResponseCount] = useState(0);

    const fetchData = useCallback(async () => {
        if (!quizId) return;
        setIsLoading(true);
        try {
            // 1. Load questionnaire + questions
            const { data: qData, error: qErr } = await supabase
                .from('questionnaires')
                .select('id, title, status, forum_channel_id, info, forum_channels(display_name), questions(id, question_text, options, correct, order_index)')
                .eq('id', quizId)
                .single();
            if (qErr) throw qErr;

            const sortedQuestions = [...((qData.questions as Question[]) || [])].sort(
                (a, b) => a.order_index - b.order_index,
            );
            const channel = Array.isArray(qData.forum_channels) ? qData.forum_channels[0] : qData.forum_channels;
            setQuestionnaire({ ...qData, forum_channels: channel, questions: sortedQuestions });

            // 2. Load responses with user display names
            const { data: responseData, error: rErr } = await supabase
                .from('responses')
                .select('id, question_id, user_id, selected_answer, score, user_profile(display_name)')
                .eq('questionnaire_id', quizId);
            if (rErr) throw rErr;

            const responses = (responseData || []).map((r: any) => ({
                ...r,
                user_profile: Array.isArray(r.user_profile) ? r.user_profile[0] : r.user_profile
            })) as Response[];
            setResponseCount(responses.length);

            // 3. Build leaderboard — group by user, sum scores
            const userMap: Record<string, LeaderboardEntry> = {};
            responses.forEach(r => {
                if (!userMap[r.user_id]) {
                    userMap[r.user_id] = {
                        userId: r.user_id,
                        displayName: r.user_profile?.display_name || 'Anonymous',
                        totalScore: 0,
                        answeredCount: 0,
                    };
                }
                userMap[r.user_id].totalScore += r.score || 0;
                userMap[r.user_id].answeredCount += 1;
            });
            setLeaderboard(Object.values(userMap).sort((a, b) => b.totalScore - a.totalScore));

            // 4. Per-question stats
            const stats: QuestionStat[] = sortedQuestions.map(q => {
                const qResponses = responses.filter(r => r.question_id === q.id);
                const correctIndices = Object.keys(q.correct || {}).map(Number);
                const distribution = (q.options as string[]).map((_, idx) => ({
                    optionIndex: idx,
                    count: qResponses.filter(r => (r.selected_answer as number[]).includes(idx)).length,
                    isCorrect: correctIndices.includes(idx),
                }));
                const correctResponses = qResponses.filter(r =>
                    correctIndices.some(ci => (r.selected_answer as number[]).includes(ci)),
                ).length;
                return {
                    question: q,
                    totalResponses: qResponses.length,
                    distribution,
                    correctRate: qResponses.length > 0
                        ? Math.round((correctResponses / qResponses.length) * 100)
                        : 0,
                };
            });
            setQuestionStats(stats);
        } catch (e: any) {
            showToast(e.message || 'Failed to load quiz results', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [quizId, supabase, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);

    if (isLoading) {
        return <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>;
    }

    if (!questionnaire) {
        return (
            <div className={adminStyles.page}>
                <p style={{ opacity: 0.5 }}>Quiz not found.</p>
            </div>
        );
    }

    const rankColor = (i: number) =>
        i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : 'var(--color-text-secondary)';

    return (
        <div className={adminStyles.page}>
            <SubPageHeader
                title={questionnaire.title}
                subtitle={`Quiz Results · Channel: ${questionnaire.forum_channels?.display_name || '—'} · ${responseCount} response${responseCount !== 1 ? 's' : ''}`}
                backHref="/dashboard/organize/quizzes"
            />

            {/* Summary cards */}
            <div className={adminStyles.statsGrid} style={{ marginBottom: 32 }}>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Participants</div>
                    <div className={adminStyles.statValue}>{leaderboard.length}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Responses</div>
                    <div className={adminStyles.statValue}>{responseCount}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Questions</div>
                    <div className={adminStyles.statValue}>{questionnaire.questions.length}</div>
                </div>
                <div className={adminStyles.statCard}>
                    <div className={adminStyles.statLabel}>Time Limit</div>
                    <div className={adminStyles.statValue}>
                        {questionnaire.info?.time_limit_seconds ? `${questionnaire.info.time_limit_seconds}s` : '—'}
                    </div>
                </div>
            </div>

            {leaderboard.length === 0 ? (
                <div className={adminStyles.emptyState}>
                    <p>
                        No responses yet. Quiz is bound to channel{' '}
                        <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 4 }}>
                            #{questionnaire.forum_channels?.display_name || '...'}
                        </code>{' '}
                        on the event forum.
                    </p>
                </div>
            ) : (
                <>
                    {/* Leaderboard */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Leaderboard</h3>
                    <table className={adminStyles.table} style={{ marginBottom: 40 }}>
                        <thead>
                            <tr>
                                <th style={{ width: 48 }}>#</th>
                                <th>Participant</th>
                                <th>Score</th>
                                <th>Answered</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboard.map((entry, i) => (
                                <tr key={entry.userId}>
                                    <td>
                                        <span style={{ fontWeight: 700, color: rankColor(i) }}>{i + 1}</span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{entry.displayName}</td>
                                    <td style={{ color: 'var(--color-brand-primary)', fontWeight: 700 }}>
                                        {entry.totalScore.toLocaleString()}
                                    </td>
                                    <td style={{ color: 'var(--color-text-secondary)' }}>
                                        {entry.answeredCount} / {questionnaire.questions.length}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Per-question breakdown */}
                    <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Question Breakdown</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {questionStats.map((stat, qi) => (
                            <div key={stat.question.id} className={adminStyles.card} style={{ padding: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                    <div style={{ flex: 1 }}>
                                        <span style={{
                                            fontSize: 11,
                                            color: 'var(--color-brand-primary)',
                                            fontWeight: 700,
                                            textTransform: 'uppercase',
                                            letterSpacing: 1,
                                        }}>
                                            Q{qi + 1}
                                        </span>
                                        <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: 15 }}>
                                            {stat.question.question_text}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                                        <div style={{
                                            fontSize: 20,
                                            fontWeight: 700,
                                            color: stat.correctRate >= 60 ? 'var(--color-brand-primary)' : '#ff6b6b',
                                        }}>
                                            {stat.correctRate}%
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>correct</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {stat.distribution.map(d => {
                                        const pct = stat.totalResponses > 0
                                            ? Math.round((d.count / stat.totalResponses) * 100)
                                            : 0;
                                        const optionText = (stat.question.options as string[])[d.optionIndex];
                                        return (
                                            <div key={d.optionIndex}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                    <span style={{
                                                        fontSize: 13,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 6,
                                                        color: d.isCorrect ? 'var(--color-brand-primary)' : 'var(--color-text-primary)',
                                                        fontWeight: d.isCorrect ? 600 : 400,
                                                    }}>
                                                        {d.isCorrect && <span style={{ fontSize: 10 }}>✓</span>}
                                                        {optionText || `Option ${d.optionIndex + 1}`}
                                                    </span>
                                                    <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                                        {d.count} ({pct}%)
                                                    </span>
                                                </div>
                                                <div style={{
                                                    height: 6,
                                                    background: 'rgba(255,255,255,0.06)',
                                                    borderRadius: 3,
                                                    overflow: 'hidden',
                                                }}>
                                                    <div style={{
                                                        height: '100%',
                                                        width: `${pct}%`,
                                                        background: d.isCorrect
                                                            ? 'var(--color-brand-primary)'
                                                            : 'rgba(255,255,255,0.2)',
                                                        borderRadius: 3,
                                                        transition: 'width 0.4s ease',
                                                    }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                    {stat.totalResponses} response{stat.totalResponses !== 1 ? 's' : ''} recorded
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
