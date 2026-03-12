"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/context/OrganizationContext";
import { useToast } from "@/components/ui/Toast";
import adminStyles from "@/components/dashboard/DashboardShared.module.css";
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
    const [questions, setQuestions] = useState<QuestionInput[]>([
        { text: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

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
                    description,
                    type: "quiz",
                    status: "published",
                    time_limit_seconds: timeLimit,
                    room_code: roomCode,
                })
                .select().single();

            if (qError) throw qError;

            const questionsToInsert = questions.map((q, idx) => ({
                questionnaire_id: qData.id,
                question_text: q.text,
                options: q.options,
                correct_option_index: q.correctIndex,
                points: 1000,
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
            />

            <form onSubmit={handleSubmit} className={adminStyles.formGrid} style={{ marginTop: '24px' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h2 className={adminStyles.sectionTitle} style={{ margin: 0 }}>Questions</h2>
                        <button type="button" className={adminStyles.btnSecondary} onClick={handleAddQuestion} style={{ fontSize: '12px' }}>+ Add Question</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {questions.map((q, qIndex) => (
                            <div key={qIndex} style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--color-interface-outline)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-brand-primary)' }}>Q{qIndex + 1}</span>
                                    {questions.length > 1 && (
                                        <button type="button" onClick={() => handleRemoveQuestion(qIndex)} style={{ border: 'none', background: 'transparent', color: 'var(--color-interface-error)', fontSize: '12px', cursor: 'pointer' }}>Remove</button>
                                    )}
                                </div>
                                <input className={adminStyles.input} type="text" placeholder="Type your question..." value={q.text} onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)} style={{ fontWeight: 600, marginBottom: '12px' }} required />
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {q.options.map((opt, oIndex) => (
                                        <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '8px', border: q.correctIndex === oIndex ? '1px solid var(--color-brand-primary)' : '1px solid transparent' }}>
                                            <input type="radio" name={`correct-${qIndex}`} checked={q.correctIndex === oIndex} onChange={() => handleQuestionChange(qIndex, "correctIndex", oIndex)} style={{ cursor: 'pointer', accentColor: 'var(--color-brand-primary)' }} />
                                            <input className={adminStyles.input} type="text" placeholder={`Opt ${oIndex + 1}`} value={opt} onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)} style={{ background: 'transparent', border: 'none', padding: 0 }} required />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button type="button" className={adminStyles.btnGhost} onClick={() => router.back()}>Cancel</button>
                    <button type="submit" className={adminStyles.btnPrimary} disabled={isSubmitting || forums.length === 0}>
                        {isSubmitting ? "Launching..." : "Create & Launch Quiz"}
                    </button>
                </div>
            </form>
        </div>
    );
}
