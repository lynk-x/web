"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import styles from "./LiveQuizClient.module.css";
type Questionnaire = any;
type Question = any;

interface LiveQuizClientProps {
    questionnaire: Questionnaire;
    questions: Question[];
    isHost?: boolean;
}

export default function LiveQuizClient({
    questionnaire,
    questions,
    isHost = false,
}: LiveQuizClientProps) {
    const [gameState, setGameState] = useState<
        "intro" | "playing" | "result" | "leaderboard" | "podium"
    >("intro");
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(questionnaire.time_limit_seconds || 20);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

    const currentQuestion = questions[currentQuestionIndex];

    // Timer logic
    useEffect(() => {
        if (gameState === "playing" && timeLeft > 0) {
            const timer = setTimeout(() => {
                setTimeLeft((prev: number) => prev - 1);
            }, 1000);
            return () => clearTimeout(timer);
        } else if (gameState === "playing" && timeLeft === 0) {
            handleTimeOut();
        }
    }, [timeLeft, gameState]);

    const handleStart = () => {
        setGameState("playing");
        setTimeLeft(questionnaire.time_limit_seconds || 20);
    };

    const handleTimeOut = () => {
        setIsCorrect(false);
        setGameState("result");
        setTimeout(() => {
            setGameState("leaderboard");
        }, 3000);
    };

    const handleOptionSelect = (index: number) => {
        if (selectedOption !== null) return; // Prevent multiple clicks

        setSelectedOption(index);
        const correct = currentQuestion.correct_option_index === index;
        setIsCorrect(correct);

        // In a real generic app, we'd save the response to Supabase here

        if (correct) {
            // Calculate points based on time left (max 1000, min 500 if answered)
            const basePoints = currentQuestion.points > 1 ? currentQuestion.points * 1000 : 1000;
            const timeBonus = Math.round((timeLeft / (questionnaire.time_limit_seconds || 20)) * 500);
            setScore((prev) => prev + basePoints + timeBonus);
        }

        setTimeout(() => {
            setGameState("result");
            setTimeout(() => {
                setGameState("leaderboard");
            }, 3000);
        }, 500);
    };

    const handleNext = () => {
        if (gameState === "result") {
            setGameState("leaderboard");
        } else if (gameState === "leaderboard") {
            setSelectedOption(null);
            setIsCorrect(null);
            if (currentQuestionIndex < questions.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
                setTimeLeft(questionnaire.time_limit_seconds || 20);
                setGameState("playing");
            } else {
                setGameState("podium");
            }
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

    if (gameState === "intro") {
        return (
            <div className={styles.container}>
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.introScreen}
                >
                    <div className={styles.logoImgWrapper}>
                        <Image src="/lynk-x_text.svg" alt="Lynk-X" width={180} height={50} priority />
                    </div>
                    <div className={styles.logo}>Lynk-X <span>Live!</span></div>
                    <h1 className={styles.title}>{questionnaire.title}</h1>
                    <p className={styles.description}>
                        {questionnaire.description || "Get ready to play!"}
                    </p>
                    <p style={{ marginBottom: "2rem", fontWeight: "bold" }}>
                        {questions.length} Questions
                    </p>
                    <button className={styles.startButton} onClick={handleStart}>
                        Start Game
                    </button>
                </motion.div>
            </div>
        );
    }

    if (gameState === "playing") {
        // Ensuring options is an array
        let optionsArray: string[] = [];
        if (Array.isArray(currentQuestion.options)) {
            optionsArray = currentQuestion.options as string[];
        } else if (typeof currentQuestion.options === 'string') {
            try {
                optionsArray = JSON.parse(currentQuestion.options);
            } catch (e) {
                optionsArray = [];
            }
        }

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
                    {optionsArray.map((opt, idx) => (
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

    if (gameState === "result") {
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
                        {isCorrect ? "Correct!" : "Incorrect"}
                    </h2>
                    {isCorrect && (
                        <div className={styles.resultPoints}>
                            Points: {score}
                        </div>
                    )}
                    {!isCorrect && (
                        <div style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>
                            The correct answer was: {(currentQuestion.options as string[])[currentQuestion.correct_option_index || 0]}
                        </div>
                    )}
                </motion.div>
            </div>
        );
    }

    if (gameState === "leaderboard") {
        const sortedLeaderboard = [{ name: "You (Player)", score: score }].sort((a, b) => b.score - a.score);

        return (
            <div className={`${styles.resultScreen} ${styles.leaderboardScreen}`}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={styles.podiumScreen} // Reusing container styles
                    style={{ width: '100%', maxWidth: '600px' }}
                >
                    <h2 className={styles.resultTitle}>Top Players</h2>
                    <div className={styles.leaderboardList}>
                        {sortedLeaderboard.map((player, idx) => (
                            <motion.div
                                key={player.name}
                                initial={{ x: -50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: idx * 0.1 }}
                                className={styles.leaderboardRow}
                                style={{
                                    backgroundColor: player.name === "You (Player)" ? 'rgba(32, 249, 40, 0.2)' : 'rgba(255,255,255,0.1)',
                                    border: player.name === "You (Player)" ? '1px solid #20F928' : 'none',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    marginBottom: '10px',
                                    fontSize: '1.2rem',
                                    fontWeight: 'bold'
                                }}
                            >
                                <span style={{ width: '40px', opacity: 0.8 }}>#{idx + 1}</span>
                                <span style={{ flex: 1, textAlign: 'left', marginLeft: '12px' }}>{player.name}</span>
                                <span style={{ color: '#20F928' }}>{player.score}</span>
                            </motion.div>
                        ))}
                    </div>
                    <button className={styles.nextButton} onClick={handleNext} style={{ marginTop: '2rem' }}>
                        {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Final Results"}
                    </button>
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
                    <h2 className={styles.resultTitle}>Podium</h2>
                    <div className={styles.podiumList} style={{ display: 'flex', flexDirection: 'column', gap: '12px', margin: '2rem 0' }}>
                        {[{ name: "You (Player)", score: score }].sort((a, b) => b.score - a.score).slice(0, 3).map((player, i) => (
                            <div key={player.name} style={{
                                background: 'linear-gradient(45deg, #ffd700, #daa520)',
                                padding: '16px', borderRadius: '8px', display: 'flex', color: 'black', fontWeight: 'bold', fontSize: '1.5rem',
                                justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <span>#{i + 1} {player.name}</span>
                                <span>{player.score}</span>
                            </div>
                        ))}
                    </div>

                    <button
                        className={styles.nextButton}
                        onClick={() => window.location.href = '/'}
                        style={{ marginTop: '2rem' }}
                    >
                        Back to Home
                    </button>
                </motion.div>
            </div>
        );
    }

    return null;
}
