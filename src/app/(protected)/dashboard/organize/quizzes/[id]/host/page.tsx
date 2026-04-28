"use client";

import { useState, useEffect, useCallback, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/components/ui/Toast';
import SubPageHeader from '@/components/shared/SubPageHeader';
import adminStyles from '@/components/dashboard/DashboardShared.module.css';
import Badge from '@/components/shared/Badge';

interface Question {
    id: string;
    question_text: string;
    options: string[];
    order_index: number;
}

interface Questionnaire {
    id: string;
    title: string;
    status: string;
    room_code: string | null;
    current_question_index: number;
    quiz_state: string;
    questions: Question[];
}

export default function QuizHostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: quizId } = use(params);
    const router = useRouter();
    const { showToast } = useToast();
    const supabase = useMemo(() => createClient(), []);

    const [quiz, setQuiz] = useState<Questionnaire | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [participantCount, setParticipantCount] = useState(0);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);

    const fetchQuiz = useCallback(async () => {
        if (!quizId) return;
        try {
            const { data, error } = await supabase
                .from('questionnaires')
                .select('*, questions(*)')
                .eq('id', quizId)
                .single();
            if (error) throw error;

            const sortedQuestions = [...((data.questions as Question[]) || [])].sort(
                (a, b) => a.order_index - b.order_index,
            );
            setQuiz({ ...data, questions: sortedQuestions });
        } catch (e: any) {
            showToast(e.message || 'Failed to load quiz host data', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [quizId, supabase, showToast]);

    const fetchLeaderboard = useCallback(async () => {
        try {
            const { data, error } = await supabase.rpc('get_quiz_leaderboard', { 
                p_quiz_id: quizId,
                p_limit: 5 
            });
            if (error) throw error;
            setLeaderboard(data || []);
        } catch (e) {
            console.error("Leaderboard fetch failed:", e);
        }
    }, [quizId, supabase]);

    useEffect(() => {
        fetchQuiz();

        // Subscribe to quiz state changes
        const channel = supabase
            .channel(`quiz-host-${quizId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'questionnaires',
                filter: `id=eq.${quizId}`
            }, (payload) => {
                setQuiz(prev => prev ? { ...prev, ...payload.new } : null);
            })
            // Realtime participant count (using Presence would be better, but simplified for now)
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [quizId, fetchQuiz, supabase]);

    useEffect(() => {
        if (quiz?.quiz_state === 'leaderboard' || quiz?.quiz_state === 'podium') {
            fetchLeaderboard();
        }
    }, [quiz?.quiz_state, fetchLeaderboard]);

    const updateQuizState = async (updates: Partial<Questionnaire>) => {
        if (!quiz) return;
        setIsUpdating(true);
        try {
            const { error } = await supabase
                .from('questionnaires')
                .update(updates)
                .eq('id', quizId);
            if (error) throw error;
        } catch (e: any) {
            showToast(e.message || 'Failed to update quiz state', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleStart = () => updateQuizState({ quiz_state: 'playing', current_question_index: 0 });
    
    const handleNext = () => {
        if (!quiz) return;
        
        switch (quiz.quiz_state) {
            case 'lobby':
                handleStart();
                break;
            case 'playing':
                updateQuizState({ quiz_state: 'reveal' });
                break;
            case 'reveal':
                updateQuizState({ quiz_state: 'leaderboard' });
                break;
            case 'leaderboard':
                if (quiz.current_question_index < quiz.questions.length - 1) {
                    updateQuizState({ 
                        quiz_state: 'playing', 
                        current_question_index: quiz.current_question_index + 1 
                    });
                } else {
                    updateQuizState({ quiz_state: 'podium' });
                }
                break;
            case 'podium':
                router.push(`/dashboard/organize/quizzes/${quizId}/results`);
                break;
        }
    };

    const handleReset = () => {
        if (confirm('Are you sure you want to reset the quiz to the lobby?')) {
            updateQuizState({ quiz_state: 'lobby', current_question_index: -1 });
        }
    };

    if (isLoading) return <div className={adminStyles.loadingContainer}><div className={adminStyles.spinner} /></div>;
    if (!quiz) return <div className={adminStyles.page}>Quiz not found.</div>;

    const currentQuestion = quiz.questions[quiz.current_question_index];

    return (
        <div className={adminStyles.page}>
            <SubPageHeader
                title={`Host: ${quiz.title}`}
                subtitle={`Control the live experience for Room: ${quiz.room_code}`}
                backHref="/dashboard/organize/quizzes"
            />

            <div className={adminStyles.subPageGrid} style={{ marginTop: 24 }}>
                {/* Control Panel */}
                <div className={adminStyles.pageCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h2 className={adminStyles.sectionTitle}>Host Controls</h2>
                        <Badge 
                            variant={quiz.quiz_state === 'playing' ? 'success' : 'neutral'} 
                            label={quiz.quiz_state.toUpperCase()} 
                            showDot 
                        />
                    </div>

                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px solid var(--color-interface-outline)' }}>
                        {quiz.quiz_state === 'lobby' && (
                            <>
                                <h3 style={{ fontSize: 48, letterSpacing: 4, margin: '0 0 16px' }}>{quiz.room_code}</h3>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>Waiting for participants to join...</p>
                                <button 
                                    className={adminStyles.primaryButton} 
                                    onClick={handleStart}
                                    disabled={isUpdating}
                                    style={{ padding: '12px 40px', fontSize: 18 }}
                                >
                                    Start Quiz
                                </button>
                            </>
                        )}

                        {quiz.quiz_state !== 'lobby' && quiz.quiz_state !== 'podium' && (
                            <>
                                <div style={{ fontSize: 14, color: 'var(--color-brand-primary)', fontWeight: 700, marginBottom: 8 }}>
                                    QUESTION {quiz.current_question_index + 1} OF {quiz.questions.length}
                                </div>
                                <h3 style={{ fontSize: 24, margin: '0 0 32px' }}>{currentQuestion?.question_text}</h3>
                                
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button 
                                        className={adminStyles.primaryButton} 
                                        onClick={handleNext}
                                        disabled={isUpdating}
                                        style={{ padding: '12px 32px' }}
                                    >
                                        {quiz.quiz_state === 'playing' ? 'Reveal Answer' : 
                                         quiz.quiz_state === 'reveal' ? 'Show Leaderboard' : 
                                         'Next Question'}
                                    </button>
                                    <button 
                                        className={adminStyles.secondaryButton} 
                                        onClick={handleReset}
                                        disabled={isUpdating}
                                    >
                                        Emergency Reset
                                    </button>
                                </div>
                            </>
                        )}

                        {quiz.quiz_state === 'podium' && (
                            <>
                                <h3 style={{ fontSize: 32, margin: '0 0 16px' }}>Quiz Finished!</h3>
                                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 32 }}>All questions have been answered.</p>
                                <button 
                                    className={adminStyles.primaryButton} 
                                    onClick={() => router.push(`/dashboard/organize/quizzes/${quizId}/results`)}
                                >
                                    View Full Results
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Status / Preview */}
                <div className={adminStyles.pageCard}>
                    <h2 className={adminStyles.sectionTitle}>Session Preview</h2>
                    <div style={{ marginTop: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Status</span>
                            <span style={{ fontWeight: 600 }}>{quiz.quiz_state}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                            <span style={{ color: 'var(--color-text-secondary)' }}>Participants</span>
                            <span style={{ fontWeight: 600 }}>Active (Realtime)</span>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--color-interface-outline)', margin: '16px 0' }} />
                        <h4 style={{ fontSize: 13, marginBottom: 12 }}>Question Sequence</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {quiz.questions.map((q, i) => (
                                <div key={q.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 10, 
                                    fontSize: 13,
                                    opacity: i === quiz.current_question_index ? 1 : 0.5,
                                    color: i === quiz.current_question_index ? 'var(--color-brand-primary)' : 'inherit'
                                }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px solid currentColor', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{i + 1}</div>
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.question_text}</span>
                                    {i < quiz.current_question_index && <span>✓</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Standings card */}
                {(quiz.quiz_state === 'leaderboard' || quiz.quiz_state === 'podium') && (
                    <div className={adminStyles.pageCard}>
                        <h2 className={adminStyles.sectionTitle}>Live Standings</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                            {leaderboard.length === 0 && <p style={{ fontSize: 13, opacity: 0.5 }}>No data available yet.</p>}
                            {leaderboard.map((entry, idx) => (
                                <div key={entry.user_id} style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '8px 12px',
                                    background: idx === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
                                    borderRadius: 8,
                                    border: idx === 0 ? '1px solid #FFD700' : '1px solid transparent'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                                        <span style={{ fontWeight: 700, width: 20, color: idx === 0 ? '#FFD700' : 'inherit' }}>#{idx + 1}</span>
                                        <span style={{ fontWeight: 600 }}>{entry.display_name}</span>
                                    </div>
                                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-brand-primary)' }}>{entry.total_score}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
