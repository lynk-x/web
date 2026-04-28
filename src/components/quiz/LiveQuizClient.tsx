"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import styles from "./LiveQuizClient.module.css";
import { createClient } from "@/utils/supabase/client";

type Questionnaire = any;
type Question = any;

interface LiveQuizClientProps {
    questionnaire: Questionnaire;
    questions: Question[];
    isHost?: boolean;
}

export default function LiveQuizClient({
    questionnaire: initialQuestionnaire,
    questions,
    isHost = false,
}: LiveQuizClientProps) {
    const supabase = useMemo(() => createClient(), []);
    const [questionnaire, setQuestionnaire] = useState(initialQuestionnaire);
    
    const [gameState, setGameState] = useState<
        "intro" | "lobby" | "playing" | "reveal" | "result" | "leaderboard" | "podium"
    >("intro");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(-1);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(initialQuestionnaire.info?.time_limit_seconds || 20);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

    useEffect(() => {
        if (questionnaire.quiz_state) {
            setGameState(questionnaire.quiz_state as any);
        }
        if (typeof questionnaire.current_question_index === 'number') {
            setCurrentQuestionIndex(questionnaire.current_question_index);
        }
    }, [questionnaire.quiz_state, questionnaire.current_question_index]);

    const fetchLeaderboard = useCallback(async () => {
        setIsLoadingLeaderboard(true);
        try {
            const { data, error } = await supabase.rpc('get_quiz_leaderboard', { 
                p_quiz_id: questionnaire.id,
                p_limit: 5 
            });
            if (error) throw error;
            setLeaderboard(data || []);
        } catch (e) {
            console.error("Leaderboard fetch failed:", e);
        } finally {
            setIsLoadingLeaderboard(false);
        }
    }, [questionnaire.id, supabase]);

    useEffect(() => {
        if (gameState === "leaderboard" || gameState === "podium") {
            fetchLeaderboard();
        }
    }, [gameState, fetchLeaderboard]);

    // Reset for new questions
    useEffect(() => {
        setSelectedOption(null);
        setIsCorrect(null);
        setTimeLeft(questionnaire.info?.time_limit_seconds || 20);
    }, [currentQuestionIndex, questionnaire.info?.time_limit_seconds]);

    // Subscribe to host updates
    useEffect(() => {
        const channel = supabase
            .channel(`quiz-sync-${initialQuestionnaire.id}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'questionnaires',
                filter: `id=eq.${initialQuestionnaire.id}`
            }, (payload) => {
                setQuestionnaire((prev: any) => ({ ...prev, ...payload.new }));
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [initialQuestionnaire.id, supabase]);

    const currentQuestion = questions[currentQuestionIndex] || questions[0];

    // Timer logic
    useEffect(() => {
        if (gameState === "playing" && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft((prev: number) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (gameState === "playing" && timeLeft === 0) {
            // Self-correct locally if time runs out before host advances
            if (selectedOption === null) {
                setIsCorrect(false);
            }
        }
    }, [timeLeft, gameState, selectedOption]);

    const handleOptionSelect = async (index: number) => {
        if (selectedOption !== null || gameState !== "playing") return;

        setSelectedOption(index);
        
        // Find correct index from JSONB structure { "0": 1000 }
        const correctIndex = parseInt(Object.keys(currentQuestion.correct || { "0": 1000 })[0]);
        const correct = correctIndex === index;
        setIsCorrect(correct);

        if (correct) {
            const basePoints = 1000;
            const timeBonus = Math.round((timeLeft / (questionnaire.info?.time_limit_seconds || 20)) * 500);
            setScore((prev) => prev + basePoints + timeBonus);
        }

        // Submit response to database
        try {
            const { data: userData } = await supabase.auth.getUser();
            await supabase.from('responses').insert({
                questionnaire_id: questionnaire.id,
                question_id: currentQuestion.id,
                user_id: userData.user?.id,
                selected_answer: [index],
                score: correct ? 1000 : 0, // Simplified score for DB
            });
        } catch (e) {
            console.error("Failed to submit response:", e);
        }
    };

    const shapes = [
        <polygon key="tri" points="25,5 50,45 0,45" fill="white" />,
        <polygon key="dia" points="25,0 50,25 25,50 0,25" fill="white" />,
        <circle key="cir" cx="25" cy="25" r="22" fill="white" />,
        <rect key="sq" x="5" y="5" width="40" height="40" fill="white" />,
        <path key="hex" d="M25,0 L47,13 L47,38 L25,50 L3,38 L3,13 Z" fill="white" />,
        <path key="star" d="M25,0 L32,15 L50,18 L38,32 L40,50 L25,40 L10,50 L12,32 L0,18 L18,15 Z" fill="white" />
    ];

    if (gameState === "intro" || gameState === "lobby" || currentQuestionIndex === -1) {
        return (
            <div className={styles.container}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.introScreen}
                >
                    <div className={styles.logoImgWrapper}>
                        <Image src="/lynk-x_combined_logo.svg" alt="Lynk-X" width={180} height={50} priority />
                    </div>
                    <div className={styles.logo}>Lynk-X <span>Live!</span></div>
                    <h1 className={styles.title}>{questionnaire.title}</h1>
                    <p className={styles.description}>
                        {questionnaire.info?.description || "Waiting for the host to start..."}
                    </p>
                    <div className={styles.lobbyCodeDisplay}>
                        <span>Room Code</span>
                        <strong>{questionnaire.room_code}</strong>
                    </div>
                    <p style={{ marginTop: "2rem", opacity: 0.7 }}>
                        The game will begin shortly.
                    </p>
                </motion.div>
            </div>
        );
    }

    if (gameState === "playing") {
        const optionsArray = Array.isArray(currentQuestion.options) 
            ? currentQuestion.options 
            : JSON.parse(currentQuestion.options || "[]");

        return (
            <div className={styles.gameContainer}>
                <motion.div
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={styles.questionHeader}
                >
                    <div className={styles.timerContainer}>
                        <AnimatePresence mode="popLayout">
                            <motion.span
                                key={timeLeft}
                                initial={{ scale: 1.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.2 } }}
                            >
                                {timeLeft}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                    <h1>{currentQuestion.question_text}</h1>
                </motion.div>

                <div className={styles.answersContainer}>
                    {optionsArray.map((opt: string, idx: number) => (
                        <motion.button
                            key={idx}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: idx * 0.1, type: "spring" }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleOptionSelect(idx)}
                            className={`${styles.answerButton} ${styles[`color${idx % 6}`]}`}
                            disabled={selectedOption !== null}
                            style={{
                                opacity: selectedOption !== null && selectedOption !== idx ? 0.3 : 1,
                                border: selectedOption === idx ? '4px solid white' : 'none'
                            }}
                        >
                            <svg width="50" height="50" className={styles.shapeIcon}>
                                {shapes[idx % 6]}
                            </svg>
                            <span>{opt}</span>
                        </motion.button>
                    ))}
                </div>
            </div>
        );
    }

    if (gameState === "reveal" || gameState === "result") {
        const correctIndex = parseInt(Object.keys(currentQuestion.correct || { "0": 1000 })[0]);
        const optionsArray = Array.isArray(currentQuestion.options) ? currentQuestion.options : JSON.parse(currentQuestion.options || "[]");

        return (
            <div
                className={`${styles.resultScreen} ${isCorrect ? styles.resultCorrect : styles.resultIncorrect}`}
            >
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                >
                    <h2 className={styles.resultTitle}>
                        {selectedOption === null ? "Time's Up!" : isCorrect ? "Correct!" : "Incorrect"}
                    </h2>
                    {isCorrect && (
                        <div className={styles.resultPoints}>
                            Current Score: {score}
                        </div>
                    )}
                    <div style={{ fontSize: '1.5rem', marginTop: '2rem', background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '12px' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '8px' }}>Correct Answer:</div>
                        {optionsArray[correctIndex]}
                    </div>
                </motion.div>
            </div>
        );
    }

    if (gameState === "leaderboard") {
        return (
            <div className={`${styles.resultScreen} ${styles.leaderboardScreen}`}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.podiumScreen}
                    style={{ width: '100%', maxWidth: '600px' }}
                >
                    <h2 className={styles.resultTitle}>Global Standings</h2>
                    
                    <div className={styles.leaderboardList} style={{ width: '100%', marginBottom: '2rem' }}>
                        {leaderboard.length === 0 && !isLoadingLeaderboard && (
                            <p style={{ opacity: 0.5 }}>Waiting for responses...</p>
                        )}
                        {leaderboard.map((entry, idx) => (
                            <motion.div
                                key={entry.user_id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'rgba(255,255,255,0.1)',
                                    padding: '12px 20px',
                                    borderRadius: '8px',
                                    marginBottom: '8px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ opacity: 0.5 }}>#{idx + 1}</span>
                                    <span>{entry.display_name}</span>
                                </div>
                                <span style={{ color: '#20F928' }}>{entry.total_score}</span>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', width: '100%' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.6 }}>Your Score</div>
                        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#20F928' }}>{score}</div>
                    </div>
                    <p style={{ opacity: 0.6, marginTop: '2rem', fontSize: '0.9rem' }}>Waiting for the host to continue...</p>
                </motion.div>
            </div>
        );
    }

    if (gameState === "podium") {
        return (
            <div className={`${styles.resultScreen} ${styles.resultFinal}`}>
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={styles.podiumScreen}
                >
                    <h2 className={styles.resultTitle}>Final Podium</h2>
                    
                    <div className={styles.leaderboardList} style={{ width: '100%', marginBottom: '3rem' }}>
                        {leaderboard.map((entry, idx) => (
                            <motion.div
                                key={entry.user_id}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.2 }}
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: idx === 0 ? 'linear-gradient(90deg, #FFD70033, #FFD70011)' : 'rgba(255,255,255,0.05)',
                                    border: idx === 0 ? '1px solid #FFD700' : '1px solid transparent',
                                    padding: idx === 0 ? '20px' : '12px 20px',
                                    borderRadius: '12px',
                                    marginBottom: '10px',
                                    fontSize: idx === 0 ? '1.8rem' : '1.2rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span style={{ fontSize: idx === 0 ? '2.5rem' : '1.2rem' }}>
                                        {idx === 0 ? '👑' : `#${idx + 1}`}
                                    </span>
                                    <span>{entry.display_name}</span>
                                </div>
                                <span style={{ color: idx === 0 ? '#FFD700' : '#20F928' }}>{entry.total_score}</span>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1rem', opacity: 0.8 }}>Your Final Score</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: '#FFD700' }}>{score}</div>
                    </div>

                    <button
                        className={styles.nextButton}
                        onClick={() => window.location.href = '/'}
                        style={{ marginTop: '2rem' }}
                    >
                        Exit Game
                    </button>
                </motion.div>
            </div>
        );
    }

    return null;
}
