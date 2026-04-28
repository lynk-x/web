"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/context/OrganizationContext";
import { useToast } from "@/components/ui/Toast";
import adminStyles from "@/components/dashboard/DashboardShared.module.css";
import styles from "./page.module.css";
import SubPageHeader from "@/components/shared/SubPageHeader";

interface EventForum {
    id: string;
    title: string;
    forum_id: string;
}

interface QuestionInput {
    text: string;
    options: [string, string, string, string];
    correctIndex: number;
}

export default function CreateQuizPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = createClient();

    const [forums, setForums] = useState<EventForum[]>([]);
    const [loadingForums, setLoadingForums] = useState(true);

    const [forumId, setForumId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [timeLimit, setTimeLimit] = useState(20);
    const [gameSettings, setGameSettings] = useState({
        speed_bonus: true,
        streak_bonus: true,
        show_leaderboard: true,
        auto_advance: false,
        show_answers: true
    });
    const [questions, setQuestions] = useState<QuestionInput[]>([
        { text: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"questions" | "settings">("questions");

    const fetchForums = useCallback(async () => {
        if (!activeAccount) return;
        try {
            const { data, error } = await supabase
                .from("events")
                .select(`id, title, forums ( id )`)
                .eq("account_id", activeAccount.id);

            if (error) throw error;

            const validForums: EventForum[] = [];
            data?.forEach((evt: any) => {
                const fId = Array.isArray(evt.forums) ? evt.forums[0]?.id : evt.forums?.id;
                if (fId) {
                    validForums.push({ id: evt.id, title: evt.title, forum_id: fId });
                }
            });

            setForums(validForums);
            if (validForums.length > 0) setForumId(validForums[0].forum_id);
        } catch (err: any) {
            showToast(err.message || "Failed to load events.", "error");
        } finally {
            setLoadingForums(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchForums();
            } else {
                setLoadingForums(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchForums]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }]);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index: number, field: "text" | "correctIndex", value: any) => {
        const newQ = [...questions];
        newQ[index][field] = value as never;
        setQuestions(newQ);
    };

    const handleOptionChange = (qIndex: number, oIndex: number, value: string) => {
        const newQ = [...questions];
        newQ[qIndex].options[oIndex] = value;
        setQuestions(newQ);
    };

    const handleToggleSetting = (key: keyof typeof gameSettings) => {
        setGameSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forumId) {
            showToast("Please select an Event to attach this Quiz to.", "error");
            return;
        }

        setIsSubmitting(true);
        try {
            const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
            const { data: qData, error: qError } = await supabase
                .from("questionnaires")
                .insert({
                    forum_id: forumId,
                    title,
                    type: "quiz",
                    status: "published",
                    info: { 
                        description, 
                        time_limit_seconds: timeLimit,
                        settings: gameSettings
                    },
                    room_code: roomCode,
                })
                .select().single();

            if (qError) throw qError;

            const questionsToInsert = questions.map((q, idx) => ({
                questionnaire_id: qData.id,
                question_text: q.text,
                options: q.options,
                correct: { [q.correctIndex]: 1000 },
                order_index: idx,
            }));

            const { error: qsError } = await supabase.from("questions").insert(questionsToInsert);
            if (qsError) throw qsError;

            showToast("Quiz created successfully!", "success");
            router.push(`/quiz/${qData.id}`);
        } catch (err: any) {
            showToast(err.message || "Failed to create quiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isOrgLoading || loadingForums) {
        return <div style={{ padding: "40px", textAlign: 'center', opacity: 0.5 }}>Loading Quiz Builder...</div>;
    }

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Create Live Quiz"
                subtitle="Build an interactive quiz for your event attendees."
                backLabel="Back to Quizzes"
                hideDivider={true}
                primaryAction={{
                    label: "Create & Launch Quiz",
                    type: "submit",
                    formId: "create-quiz-form",
                    isLoading: isSubmitting
                }}
            />

            <div className={adminStyles.tabs} style={{ marginTop: '24px', marginBottom: '24px' }}>
                <button 
                    type="button" 
                    className={`${adminStyles.tab} ${activeTab === 'questions' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('questions')}
                >
                    Questions ({questions.length})
                </button>
                <button 
                    type="button" 
                    className={`${adminStyles.tab} ${activeTab === 'settings' ? adminStyles.tabActive : ''}`}
                    onClick={() => setActiveTab('settings')}
                >
                    Settings
                </button>
            </div>

            <form id="create-quiz-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {activeTab === 'settings' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle}>Basic Settings</h2>
                            <div className={adminStyles.formGrid}>
                                <div className={adminStyles.formGroup}>
                                    <label className={adminStyles.label}>Link to Event / Forum <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <select className={adminStyles.select} value={forumId} onChange={(e) => setForumId(e.target.value)} required>
                                        <option value="" disabled>Select an Event</option>
                                        {forums.map((f) => <option key={f.id} value={f.forum_id}>{f.title}</option>)}
                                    </select>
                                </div>
                                <div className={adminStyles.formGroup}>
                                    <label className={adminStyles.label}>Quiz Title <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <input className={adminStyles.input} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Ultimate Tech Trivia!" required />
                                </div>
                                <div className={adminStyles.formGroup} style={{ gridColumn: '1 / -1' }}>
                                    <label className={adminStyles.label}>Description</label>
                                    <textarea className={adminStyles.textarea} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A short intro for the waiting lobby..." rows={3} />
                                </div>
                                <div className={adminStyles.formGroup} style={{ maxWidth: '120px' }}>
                                    <label className={adminStyles.label}>Time (Sec) <span className={adminStyles.requiredIndicator}>*Required</span></label>
                                    <input className={adminStyles.input} type="number" min="5" max="120" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} required />
                                </div>
                            </div>
                        </div>

                        <div className={adminStyles.pageCard}>
                            <h2 className={adminStyles.sectionTitle}>Game Mechanics</h2>
                            <div className={adminStyles.formGrid}>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className={styles.toggleRow}>
                                        <label className={adminStyles.label} style={{ margin: 0 }}>Speed Bonus</label>
                                        <label className={styles.switch}>
                                            <input type="checkbox" checked={gameSettings.speed_bonus} onChange={() => handleToggleSetting('speed_bonus')} />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleRow}>
                                        <label className={adminStyles.label} style={{ margin: 0 }}>Streak Bonus</label>
                                        <label className={styles.switch}>
                                            <input type="checkbox" checked={gameSettings.streak_bonus} onChange={() => handleToggleSetting('streak_bonus')} />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleRow}>
                                        <label className={adminStyles.label} style={{ margin: 0 }}>Show Leaderboard</label>
                                        <label className={styles.switch}>
                                            <input type="checkbox" checked={gameSettings.show_leaderboard} onChange={() => handleToggleSetting('show_leaderboard')} />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <div className={styles.toggleRow}>
                                        <label className={adminStyles.label} style={{ margin: 0 }}>Auto-Advance</label>
                                        <label className={styles.switch}>
                                            <input type="checkbox" checked={gameSettings.auto_advance} onChange={() => handleToggleSetting('auto_advance')} />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                    <div className={styles.toggleRow}>
                                        <label className={adminStyles.label} style={{ margin: 0 }}>Show Results Chart</label>
                                        <label className={styles.switch}>
                                            <input type="checkbox" checked={gameSettings.show_answers} onChange={() => handleToggleSetting('show_answers')} />
                                            <span className={styles.slider}></span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'questions' && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <h2 className={adminStyles.sectionTitle} style={{ margin: 0 }}>Questions</h2>
                            <button type="button" className={adminStyles.btnSecondary} onClick={handleAddQuestion} style={{ fontSize: '12px' }}>+ Add Question</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} style={{ padding: '24px', background: 'var(--color-interface-surface)', borderRadius: '16px', border: '1px solid var(--color-interface-outline)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <span style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-brand-primary)' }}>Question {qIndex + 1}</span>
                                        {questions.length > 1 && (
                                            <button type="button" onClick={() => handleRemoveQuestion(qIndex)} style={{ border: 'none', background: 'transparent', color: 'var(--color-interface-error)', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Remove</button>
                                        )}
                                    </div>
                                    <input className={adminStyles.input} type="text" placeholder="Type your question..." value={q.text} onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)} style={{ fontWeight: 600, marginBottom: '16px', fontSize: '16px' }} required />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: q.correctIndex === oIndex ? '1px solid var(--color-brand-primary)' : '1px solid var(--color-interface-outline)', transition: 'all 0.2s' }}>
                                                <input type="radio" name={`correct-${qIndex}`} checked={q.correctIndex === oIndex} onChange={() => handleQuestionChange(qIndex, "correctIndex", oIndex)} style={{ cursor: 'pointer', accentColor: 'var(--color-brand-primary)', width: '18px', height: '18px' }} />
                                                <input className={adminStyles.input} type="text" placeholder={`Option ${oIndex + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} style={{ background: 'transparent', border: 'none', padding: 0, fontSize: '14px' }} required />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </form>
        </div>
    );
}
