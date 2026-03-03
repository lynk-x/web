import React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LiveQuizClient from "@/components/quiz/LiveQuizClient";

interface QuizPageProps {
    params: {
        id: string;
    };
}

export default async function QuizPage({ params }: QuizPageProps) {
    const supabase = await createClient();

    // Feature Flag Check
    const { data: flagData } = await supabase
        .from("feature_flags")
        .select("is_enabled")
        .eq("key", "live_quiz")
        .single();

    if (!flagData?.is_enabled) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <h1>Feature Disabled</h1>
                <p>Live quizzes are currently disabled.</p>
            </div>
        );
    }

    // Fetch the questionnaire
    const resolvedParams = await params;

    const { data: questionnaire, error: qError } = await supabase
        .from("questionnaires")
        .select("*")
        .eq("id", resolvedParams.id)
        .single();

    if (qError || !questionnaire) {
        return notFound();
    }

    // Fetch all questions for this questionnaire
    const { data: questions, error: qmError } = await supabase
        .from("questions")
        .select("*")
        .eq("questionnaire_id", questionnaire.id)
        .order("order_index", { ascending: true });

    if (qmError || !questions || questions.length === 0) {
        return (
            <div style={{ padding: "4rem", textAlign: "center" }}>
                <h1>No questions found for this quiz.</h1>
            </div>
        );
    }

    // We are not enforcing auth on this page to allow guests to join,
    // but in a production app you'd get the user session -> sync score to DB.

    return (
        <main style={{ minHeight: "100vh", backgroundColor: "#f2f2f2" }}>
            <LiveQuizClient
                questionnaire={questionnaire}
                questions={questions}
            />
        </main>
    );
}
