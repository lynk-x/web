"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useOrganization } from "@/context/OrganizationContext";
import { useToast } from "@/components/ui/Toast";
import styles from "./page.module.css";
import PageHeader from "@/components/dashboard/PageHeader";

// Simplified type for fetching available forums via events
interface EventForum {
    id: string; // Event ID
    title: string;
    forum_id: string; // The associated Forum ID needed for the Questionnaire
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

    // Reference Data State
    const [forums, setForums] = useState<EventForum[]>([]);
    const [loadingForums, setLoadingForums] = useState(true);

    // Form State
    const [forumId, setForumId] = useState("");
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [timeLimit, setTimeLimit] = useState(20);
    const [questions, setQuestions] = useState<QuestionInput[]>([
        { text: "", options: ["", "", "", ""], correctIndex: 0 },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load active events for this organizer
    const fetchForums = useCallback(async () => {
        if (!activeAccount) return;
        try {
            // Query events owned by the active account, joined with their forums
            const { data, error } = await supabase
                .from("events")
                .select(`
          id,
          title,
          forums ( id )
        `)
                .eq("account_id", activeAccount.id);

            if (error) throw error;

            // Extract only events that have a valid forum
            const validForums: EventForum[] = [];
            data?.forEach((evt: any) => {
                if (evt.forums && evt.forums.id) {
                    validForums.push({
                        id: evt.id,
                        title: evt.title,
                        forum_id: evt.forums.id, // Using standard relational lookup if it's 1-to-1
                    });
                } else if (Array.isArray(evt.forums) && evt.forums.length > 0) {
                    validForums.push({
                        id: evt.id,
                        title: evt.title,
                        forum_id: evt.forums[0].id,
                    });
                }
            });

            setForums(validForums);
            if (validForums.length > 0) {
                setForumId(validForums[0].forum_id);
            }
        } catch (err: any) {
            showToast(err.message || "Failed to load events.", "error");
        } finally {
            setLoadingForums(false);
        }
    }, [activeAccount, supabase, showToast]);

    useEffect(() => {
        if (!isOrgLoading) fetchForums();
    }, [isOrgLoading, fetchForums]);

    // Question array manipulation
    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            { text: "", options: ["", "", "", ""], correctIndex: 0 },
        ]);
    };

    const handleRemoveQuestion = (index: number) => {
        if (questions.length === 1) return;
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleQuestionChange = (
        index: number,
        field: "text" | "correctIndex",
        value: any
    ) => {
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

        // Validation
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            if (!q.text.trim()) {
                showToast(`Question ${i + 1} is missing text.`, "error");
                return;
            }
            if (q.options.some(o => !o.trim())) {
                showToast(`Question ${i + 1} is missing some options.`, "error");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Generate a random 6-digit Game PIN
            const roomCode = Math.floor(100000 + Math.random() * 900000).toString();

            // 1. Insert Questionnaire
            const { data: qData, error: qError } = await supabase
                .from("questionnaires")
                .insert({
                    forum_id: forumId,
                    title,
                    description,
                    type: "quiz", // Hardcode enum
                    status: "published",
                    time_limit_seconds: timeLimit,
                    room_code: roomCode,
                })
                .select()
                .single();

            if (qError) throw qError;

            // 2. Insert Questions
            const questionsToInsert = questions.map((q, idx) => ({
                questionnaire_id: qData.id,
                question_text: q.text,
                options: q.options, // Stored as JSONB Array
                correct_option_index: q.correctIndex,
                points: 1000,
                order_index: idx,
            }));

            const { error: qsError } = await supabase
                .from("questions")
                .insert(questionsToInsert);

            if (qsError) throw qsError;

            showToast("Quiz created successfully!", "success");
            // Redirect to the playable quiz page so they can test/show it
            router.push(`/quiz/${qData.id}`);
        } catch (err: any) {
            showToast(err.message || "Failed to create quiz.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isOrgLoading || loadingForums) {
        return <div style={{ padding: "40px" }}>Loading App Context...</div>;
    }

    return (
        <div className={styles.container}>
            <PageHeader
                title="Create Live Interactive Quiz"
                subtitle="Build an interactive quiz for your event attendees."
            />

            <form onSubmit={handleSubmit}>
                <div className={styles.panel}>
                    <div className={styles.header}>Basic Settings</div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Link to Event / Forum</label>
                        <select
                            className={styles.input}
                            value={forumId}
                            onChange={(e) => setForumId(e.target.value)}
                            required
                        >
                            <option value="" disabled>Select an Event</option>
                            {forums.map((f) => (
                                <option key={f.id} value={f.forum_id}>
                                    {f.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Quiz Title</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Ultimate Tech Trivia!"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Description (Optional)</label>
                        <textarea
                            className={styles.textarea}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="A short intro for the waiting lobby..."
                        />
                    </div>

                    <div className={styles.formGroup} style={{ maxWidth: "200px" }}>
                        <label className={styles.label}>Time Limit (Seconds)</label>
                        <input
                            className={styles.input}
                            type="number"
                            min="5"
                            max="120"
                            value={timeLimit}
                            onChange={(e) => setTimeLimit(Number(e.target.value))}
                            required
                        />
                    </div>
                </div>

                <div className={styles.panel}>
                    <div className={styles.header}>Questions</div>

                    {questions.map((q, qIndex) => (
                        <div key={qIndex} className={styles.questionCard}>
                            <div className={styles.questionHeader}>
                                <span className={styles.questionTitle}>Question {qIndex + 1}</span>
                                {questions.length > 1 && (
                                    <button
                                        type="button"
                                        className={styles.deleteButton}
                                        onClick={() => handleRemoveQuestion(qIndex)}
                                    >
                                        Remove Question
                                    </button>
                                )}
                            </div>

                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Type your question here..."
                                value={q.text}
                                onChange={(e) => handleQuestionChange(qIndex, "text", e.target.value)}
                                style={{ marginBottom: "12px", fontSize: "1.2rem", fontWeight: "bold" }}
                                required
                            />

                            <div className={styles.optionsGrid}>
                                {q.options.map((opt, oIndex) => (
                                    <div key={oIndex} className={styles.optionWrapper}>
                                        <input
                                            type="radio"
                                            className={styles.optionRadio}
                                            name={`correct-${qIndex}`}
                                            checked={q.correctIndex === oIndex}
                                            onChange={() => handleQuestionChange(qIndex, "correctIndex", oIndex)}
                                            title="Mark as correct answer"
                                        />
                                        <input
                                            type="text"
                                            className={styles.optionInput}
                                            placeholder={`Option ${oIndex + 1}`}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(qIndex, oIndex, e.target.value)}
                                            required
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    <button
                        type="button"
                        className={styles.addQuestionBtn}
                        onClick={handleAddQuestion}
                    >
                        + Add Another Question
                    </button>
                </div>

                <div className={styles.footer}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => router.back()}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className={`${styles.btn} ${styles.btnPrimary}`}
                        disabled={isSubmitting || forums.length === 0}
                    >
                        {isSubmitting ? "Saving..." : "Create & Launch Quiz"}
                    </button>
                </div>
            </form>
        </div>
    );
}
