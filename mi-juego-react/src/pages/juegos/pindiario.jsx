import React, { useState, useEffect, useCallback } from 'react';

const PIN_LENGTH = 4;
const MAX_GUESSES = 6;
const ENTER_KEY = "ENTER";
const BACKSPACE_KEY = "⌫";

const DigitStatus = {
    Default: 'Default',
    Correct: 'Correct',
    Present: 'Present',
    Absent: 'Absent'
};

const statusMap = {
    1: DigitStatus.Correct,
    2: DigitStatus.Present,
    3: DigitStatus.Absent
};

const GameStatus = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost'
};

export default function AdivinaElPin({ onLogout }) {
    const [gamePinId, setGamePinId] = useState(0);
    const [targetPin, setTargetPin] = useState('');
    const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(' '.repeat(PIN_LENGTH)));
    const [currentRow, setCurrentRow] = useState(0);
    const [activeCol, setActiveCol] = useState(0);
    const [gameStatus, setGameStatus] = useState(GameStatus.Playing);
    const [keyStatuses, setKeyStatuses] = useState({});
    const [digitStatuses, setDigitStatuses] = useState(Array(MAX_GUESSES).fill(Array(PIN_LENGTH).fill(DigitStatus.Default)));
    const [isLoading, setIsLoading] = useState(true);
    const [errorAttemptsExceeded, setErrorAttemptsExceeded] = useState(false);

    const isPlaying = gameStatus === GameStatus.Playing && !errorAttemptsExceeded;

    const getDailyPinFromServer = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return null;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/GamePin/dailypin`, {
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
            });

            if (!response.ok) {
                if (response.status === 401) onLogout();
                return null;
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Error al obtener PIN:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [onLogout]);

    const submitGuessToServer = useCallback(async (guess) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return null;
            }

            const requestBody = {
                GamePinId: gamePinId,
                Guess: guess,
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/GamePin/guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: "Bearer " + token.replace(/"/g, '')
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorContent = await response.text();
                if (response.status === 401) onLogout();
                // Retornar un objeto con un error si la respuesta no es OK
                return { error: errorContent };
            }

            return await response.json();

        } catch (error) {
            console.error('Error al enviar intento:', error);
            return { error: error.message };
        }
    }, [gamePinId, onLogout]);

    const awardPoints = useCallback(async () => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Game/addpoints/50`, {
                method: 'POST',
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Puntos sumados. Total:", data.totalPoints);
            }

        } catch (ex) {
            console.error(`Error al sumar puntos: ${ex.message}`);
        }
    }, []);

    const saveGameState = useCallback(() => {
        const userId = localStorage.getItem('userId');
        const state = {
            TargetPin: targetPin,
            Guesses: guesses,
            CurrentRow: currentRow,
            GameStatus: gameStatus,
            DigitStatuses: digitStatuses
        };
        localStorage.setItem(`pinGuessState_${gamePinId}_${userId}`, JSON.stringify(state));
    }, [targetPin, guesses, currentRow, gameStatus, digitStatuses, gamePinId]);

    const submitGuess = useCallback(async (guess) => {
        if (guess.length !== PIN_LENGTH || !/^\d+$/.test(guess)) return;
        if (!isPlaying) return;

        const response = await submitGuessToServer(guess);
        if (!response) return;

        // Comprobación de error de intentos excedidos del servidor
        if (response.error) {
            if (response.error.includes("límite de 6 intentos")) {
                setErrorAttemptsExceeded(true);
                setGameStatus(GameStatus.Lost);
                return;
            } else {
                console.error("Error inesperado:", response.error);
                return;
            }
        }
        
        const updatedDigitStatuses = [...digitStatuses];
        updatedDigitStatuses[currentRow] = response.digitStatuses.map(s => statusMap[s]);
        setDigitStatuses(updatedDigitStatuses);

        const updatedKeyStatuses = { ...keyStatuses };
        for (let i = 0; i < PIN_LENGTH; i++) {
            const digit = guess[i];
            const status = updatedDigitStatuses[currentRow][i];
            if (!updatedKeyStatuses[digit] || updatedKeyStatuses[digit] < status) {
                updatedKeyStatuses[digit] = status;
            }
        }
        setKeyStatuses(updatedKeyStatuses);

        let newStatus = gameStatus;
        if (response.isSolved) {
            newStatus = GameStatus.Won;
            await awardPoints();
        } else if (currentRow + 1 >= MAX_GUESSES) {
            newStatus = GameStatus.Lost;
        }

        const updatedGuesses = [...guesses];
        updatedGuesses[currentRow] = guess;

        setGuesses(updatedGuesses);
        setGameStatus(newStatus);
        saveGameState();

        if (newStatus === GameStatus.Playing) {
            setCurrentRow(currentRow + 1);
            setActiveCol(0);
        } else {
            setActiveCol(0);
        }
    }, [guesses, currentRow, submitGuessToServer, digitStatuses, keyStatuses, gameStatus, saveGameState, awardPoints, isPlaying]);

    const handleKeyPress = useCallback((key) => {
        if (!isPlaying || currentRow >= MAX_GUESSES) return;

        let newGuesses = [...guesses];
        let rowDigits = newGuesses[currentRow].split('');
        let newActiveCol = activeCol;

        if (key === ENTER_KEY && !rowDigits.includes(' ')) {
            submitGuess(newGuesses[currentRow]);
        } else if (key === BACKSPACE_KEY && activeCol > 0) {
            newActiveCol--;
            rowDigits[newActiveCol] = ' ';
        } else if (/^\d$/.test(key) && activeCol < PIN_LENGTH) {
            rowDigits[activeCol] = key;
            newActiveCol++;
        }

        newGuesses[currentRow] = rowDigits.join('');
        setGuesses(newGuesses);
        setActiveCol(newActiveCol);
    }, [guesses, currentRow, activeCol, isPlaying, submitGuess]);

    const startNewGame = useCallback(async () => {
        setIsLoading(true);
        setErrorAttemptsExceeded(false); // Reinicia el estado de error
        const dailyPinInfo = await getDailyPinFromServer();
        if (!dailyPinInfo) {
            setGameStatus(GameStatus.Lost);
            return;
        }

        setGamePinId(dailyPinInfo.gamePinId);

        if (dailyPinInfo.attemptsUsed >= MAX_GUESSES) {
            setErrorAttemptsExceeded(true);
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        if (dailyPinInfo.isSolved) {
            setTargetPin(dailyPinInfo.pin);
            setGameStatus(GameStatus.Won);
            setGuesses([dailyPinInfo.pin].concat(Array(MAX_GUESSES - 1).fill(' '.repeat(PIN_LENGTH))));
            setDigitStatuses([Array(PIN_LENGTH).fill(DigitStatus.Correct)].concat(Array(MAX_GUESSES - 1).fill(Array(PIN_LENGTH).fill(DigitStatus.Default))));
        } else {
            const userId = localStorage.getItem('userId');
            const savedState = JSON.parse(localStorage.getItem(`pinGuessState_${dailyPinInfo.gamePinId}_${userId}`) || 'null');

            if (savedState) {
                setTargetPin(savedState.TargetPin);
                setGuesses(savedState.Guesses);
                setCurrentRow(savedState.CurrentRow);
                setGameStatus(savedState.GameStatus);
                setDigitStatuses(savedState.DigitStatuses);

                let newCurrentRow = savedState.CurrentRow;
                let newActiveCol = savedState.Guesses[newCurrentRow].indexOf(' ');
                if (newActiveCol === -1) {
                    newCurrentRow++;
                    newActiveCol = 0;
                }

                setCurrentRow(newCurrentRow);
                setActiveCol(newActiveCol);

                const newKeyStatuses = {};
                savedState.Guesses.forEach((guess, r) => {
                    if (r < savedState.CurrentRow) {
                        guess.split('').forEach((digit, c) => {
                            if (digit !== ' ' && savedState.DigitStatuses[r]?.[c]) {
                                const status = savedState.DigitStatuses[r][c];
                                if (!newKeyStatuses[digit] || newKeyStatuses[digit] < status) {
                                    newKeyStatuses[digit] = status;
                                }
                            }
                        });
                    }
                });
                setKeyStatuses(newKeyStatuses);

                if (savedState.CurrentRow >= MAX_GUESSES && savedState.GameStatus !== GameStatus.Won) {
                    setErrorAttemptsExceeded(true);
                    setGameStatus(GameStatus.Lost);
                }
            } else {
                setTargetPin('');
                setGuesses(Array(MAX_GUESSES).fill(' '.repeat(PIN_LENGTH)));
                setDigitStatuses(Array(MAX_GUESSES).fill(Array(PIN_LENGTH).fill(DigitStatus.Default)));
                setKeyStatuses({});
                setCurrentRow(0);
                setActiveCol(0);
                setGameStatus(GameStatus.Playing);
            }
        }
        setIsLoading(false);
    }, [getDailyPinFromServer]);

    useEffect(() => { startNewGame(); }, [startNewGame]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER') handleKeyPress(ENTER_KEY);
            else if (key === 'BACKSPACE' || e.key === 'Backspace') handleKeyPress(BACKSPACE_KEY);
            else if (/^\d$/.test(key)) handleKeyPress(key);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const getCellClass = (row, col) => {
        const status = digitStatuses[row]?.[col] ?? DigitStatus.Default;
        const classes = ['cell', 'w-12', 'h-12', 'flex', 'justify-center', 'items-center', 'rounded-md', 'border-2', 'text-2xl', 'font-bold'];

        if (status === DigitStatus.Correct) return [...classes, 'bg-green-600', 'text-white', 'border-green-600'].join(' ');
        if (status === DigitStatus.Present) return [...classes, 'bg-yellow-500', 'text-white', 'border-yellow-500'].join(' ');
        if (status === DigitStatus.Absent) return [...classes, 'bg-gray-700', 'text-white', 'border-gray-700'].join(' ');

        if (row === currentRow && col === activeCol && isPlaying) return [...classes, 'bg-gray-900', 'border-blue-500', 'animate-pulse'].join(' ');

        return [...classes, 'bg-gray-900', 'text-gray-200', 'border-gray-600'].join(' ');
    };

    const getKeyClass = (key) => {
        const status = keyStatuses[key];
        const classes = ['key', 'p-3', 'rounded-md', 'text-lg', 'font-bold', 'cursor-pointer', 'select-none'];

        if (status === DigitStatus.Correct) return [...classes, 'bg-green-600', 'text-white'].join(' ');
        if (status === DigitStatus.Present) return [...classes, 'bg-yellow-500', 'text-white'].join(' ');
        if (status === DigitStatus.Absent) return [...classes, 'bg-gray-700', 'text-white'].join(' ');

        return [...classes, 'bg-gray-600', 'hover:bg-gray-500', 'text-white'].join(' ');
    };

    return (
        <div className="flex flex-col items-center justify-start p-6 bg-gray-950 text-white min-h-screen">
            <h3 className="text-3xl font-extrabold text-purple-400 mb-6">Adivina el PIN</h3>

            {isLoading ? (
                <div className="text-xl text-purple-400">Cargando PIN...</div>
            ) : (
                <>
                    {errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            Has alcanzado el límite de {MAX_GUESSES} intentos sin resolver el PIN. No puedes seguir jugando hoy.
                        </div>
                    )}

                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${PIN_LENGTH}, minmax(0, 1fr))` }}>
                        {guesses.flatMap((row, rowIndex) =>
                            row.split('').map((char, colIndex) => (
                                <div key={`${rowIndex}-${colIndex}`} className={getCellClass(rowIndex, colIndex)}>
                                    {char !== ' ' ? char : ''}
                                </div>
                            ))
                        )}
                    </div>

                    <div className="keyboard mt-6 w-full max-w-sm grid grid-cols-3 gap-2">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((key) => (
                            <button key={key} className={getKeyClass(key)} onClick={() => handleKeyPress(key)} disabled={!isPlaying}>
                                {key}
                            </button>
                        ))}
                        <button className={getKeyClass(BACKSPACE_KEY)} onClick={() => handleKeyPress(BACKSPACE_KEY)} disabled={!isPlaying}>⌫</button>
                        <button className={getKeyClass("0")} onClick={() => handleKeyPress("0")} disabled={!isPlaying}>0</button>
                        <button className={getKeyClass(ENTER_KEY)} onClick={() => handleKeyPress(ENTER_KEY)} disabled={!isPlaying}>ENTER</button>
                    </div>

                    {!isPlaying && !errorAttemptsExceeded && (
                        <div className="mt-4 text-center">
                            {gameStatus === GameStatus.Won ? (
                                <div className="bg-green-600 p-4 rounded-lg">
                                    <h4 className="text-xl font-bold">¡Ganaste!</h4>
                                    <p>El PIN era: <strong>{targetPin}</strong></p>
                                </div>
                            ) : (
                                <div className="bg-red-600 p-4 rounded-lg">
                                    <h4 className="text-xl font-bold">¡Perdiste!</h4>
                                    <p>El PIN era: <strong>{targetPin}</strong></p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}