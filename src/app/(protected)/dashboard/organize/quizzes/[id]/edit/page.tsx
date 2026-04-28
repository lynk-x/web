"use client";

import React, { useState, useEffect, useCallback, use } from "react";
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
    id?: string;
    text: string;
    options: string[];
    correctIndex: number;
}

export default function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const { showToast } = useToast();
    const { activeAccount, isLoading: isOrgLoading } = useOrganization();
    const supabase = createClient();

    const [forums, setForums] = useState<EventForum[]>([]);
    const [loading, setLoading] = useState(true);

    const [forumId, setForumId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [timeLimit, setTimeLimit] = useState(20);
    const [questions, setQuestions] = useState<QuestionInput[]>([]);
    const [initialQuestionIds, setInitialQuestionIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        if (!activeAccount || !id) return;
        try {
            // 1. Fetch Forums
            const { data: eventData, error: eventError } = await supabase
                .from("events")
                .select(`id, title, forums ( id )`)
                .eq("account_id", activeAccount.id);

            if (eventError) throw eventError;

            const validForums: EventForum[] = [];
            eventData?.forEach((evt: any) => {
                const fId = Array.isArray(evt.forums) ? evt.forums[0]?.id : evt.forums?.id;
                if (fId) {
                    validForums.push({ id: evt.id, title: evt.title, forum_id: fId });
                }
            });
            setForums(validForums);

            // 2. Fetch Quiz Data
            const { data: quiz, error: quizError } = await supabase
                .from("questionnaires")
                .select("*, questions(*)")
                .eq("id", id)
                .single();

            if (quizError) throw quizError;

            setTitle(quiz.title);
            setDescription(quiz.info?.description || "");
            setTimeLimit(quiz.info?.time_limit_seconds || 20);
            setForumId(quiz.forum_id);

            const fetchedQuestions = (quiz.questions || [])
                .sort((a: any, b: any) => a.order_index - b.order_index)
                .map((q: any) => ({
                    id: q.id,
                    text: q.question_text,
                    options: Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]"),
                    correctIndex: parseInt(Object.keys(q.correct || { "0": 1000 })[0]),
                }));

            setQuestions(fetchedQuestions);
            setInitialQuestionIds(fetchedQuestions.map((q: any) => q.id));
        } catch (err: any) {
            showToast(err.message || "Failed to load quiz.", "error");
            router.push("/dashboard/organize/quizzes");
        } finally {
            setLoading(false);
        }
    }, [activeAccount, id, supabase, showToast, router]);

    useEffect(() => {
        if (!isOrgLoading) {
            if (activeAccount) {
                fetchData();
            } else {
                setLoading(false);
            }
        }
    }, [isOrgLoading, activeAccount, fetchData]);

    const handleAddQuestion = () => {
        setQuestions([...questions, { text: "", options: ["", "", "", ""], correctIndex: 0 }]);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (index: number, field: "text" | "correctIndex", value: any) => {
        const newQ = [...questions];
        (newQ[index] as any)[field] = value;
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
            // 1. Update Questionnaire
            const { error: qUpdateError } = await supabase
                .from("questionnaires")
                .update({
                    forum_id: forumId,
                    title,
                    info: { description, time_limit_seconds: timeLimit },
                })
                .eq("id", id);

            if (qUpdateError) throw qUpdateError;

            // 2. Manage Questions
            const currentQuestionIds = questions.map(q => q.id).filter(Boolean) as string[];
            const questionsToDelete = initialQuestionIds.filter(id => !currentQuestionIds.includes(id));

            // Delete removed questions
            if (questionsToDelete.length > 0) {
                const { error: delError } = await supabase.from("questions").delete().in("id", questionsToDelete);
                if (delError) throw delError;
            }

            // Upsert remaining/new questions
            const questionsToUpsert = questions.map((q, idx) => ({
                ...(q.id ? { id: q.id } : {}),
                questionnaire_id: id,
                question_text: q.text,
                options: q.options,
                correct: { [q.correctIndex]: 1000 },
                order_index: idx,
            }));

            const { error: upsertError } = await supabase.from("questions").upsert(questionsToUpsert);
            if (upsertError) throw upsertError;

            showToast("Quiz updated successfully!", "success");
            router.push("/dashboard/organize/quizzes");
        } catch (err: any) {
            showToast(err.message || "Failed to update quiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return <div style={{ padding: "40px", textAlign: 'center', opacity: 0.5 }}>Loading Quiz Editor...</div>;
    }

    return (
        <div className={adminStyles.container}>
            <SubPageHeader
                title="Edit Quiz"
                subtitle="Modify your quiz settings and questions."
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
                        {isSubmitting ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
