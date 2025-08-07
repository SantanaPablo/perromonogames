import React, { useState, useEffect, useCallback } from 'react';
import * as lucide from 'lucide-react'; // Para el icono de carga

// Constantes
const WORD_LENGTH = 5;
const MAX_GUESSES = 6;
const ENTER_KEY = "ENTER";
const BACKSPACE_KEY = "⌫";

const LetterStatus = {
    Default: 'Default',
    Correct: 'Correct',
    Present: 'Present',
    Absent: 'Absent'
};

const statusMap = {
    1: LetterStatus.Correct,
    2: LetterStatus.Present,
    3: LetterStatus.Absent
};

const GameStatus = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost'
};

export default function PalabraDiaria({ onLogout }) {
    const [gameWordId, setGameWordId] = useState(0);
    const [targetWord, setTargetWord] = useState(''); // Solo se llenará si la palabra es resuelta
    const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(' '.repeat(WORD_LENGTH)));
    const [currentRow, setCurrentRow] = useState(0);
    const [activeCol, setActiveCol] = useState(0);
    const [gameStatus, setGameStatus] = useState(GameStatus.Playing);
    const [keyStatuses, setKeyStatuses] = useState({});
    const [letterStatuses, setLetterStatuses] = useState(Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill(LetterStatus.Default)));
    const [isLoading, setIsLoading] = useState(true);

    // Estado para controlar límite de intentos
    const [errorAttemptsExceeded, setErrorAttemptsExceeded] = useState(false);

    const isPlaying = gameStatus === GameStatus.Playing && !errorAttemptsExceeded;

    const getDailyWordFromServer = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return null;
            }

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/game/dailyword`, {
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
            });

            if (!response.ok) {
                if (response.status === 401) onLogout();
                console.error('Error al obtener palabra del día:', response.statusText);
                return null;
            }

            const data = await response.json();
            // data ahora incluye 'attemptsUsed' del backend
            return data;

        } catch (error) {
            console.error('Error al obtener palabra del día:', error);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, [onLogout]);

    const awardPoints = useCallback(async (attempts) => {
        let pointsToAward = 0;
        switch (attempts) {
            case 1: pointsToAward = 500; break;
            case 2: pointsToAward = 400; break;
            case 3: pointsToAward = 300; break;
            case 4: pointsToAward = 200; break;
            case 5: pointsToAward = 100; break;
            case 6: pointsToAward = 50; break;
            default: pointsToAward = 0; break;
        }

        if (pointsToAward === 0) return;

        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Game/addpoints/${pointsToAward}`, {
                method: 'POST',
                headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
            });

            if (!response.ok) {
                console.error('Error al sumar puntos:', response.status);
            } else {
                const data = await response.json();
                console.log(`Puntos sumados con éxito (${pointsToAward}). Total:`, data.totalPoints);
            }
        } catch (ex) {
            console.error(`Excepción al sumar puntos: ${ex.message}`);
        }
    }, []);

    const submitGuessToServer = useCallback(async (guess) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return null;
            }

            const requestBody = {
                GameWordId: gameWordId,
                Guess: guess,
            };

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/game/guess`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorContent = await response.text();
                if (response.status === 401) onLogout();
                return { error: errorContent };
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('Error enviando intento:', error);
            return { error: error.message };
        }
    }, [gameWordId, onLogout]);

    const saveGameState = useCallback(() => {
        const userId = localStorage.getItem('userId');
        const state = {
            // targetWord no se guarda porque solo se revela al ganar
            Guesses: guesses,
            CurrentRow: currentRow,
            GameStatus: gameStatus,
            LetterStatuses: letterStatuses
        };
        localStorage.setItem(`wordGuessState_${gameWordId}_${userId}`, JSON.stringify(state));
    }, [guesses, currentRow, gameStatus, letterStatuses, gameWordId]);

    const submitGuess = useCallback(async (guess) => {
        if (guess.length !== WORD_LENGTH) return;
        if (!isPlaying) return;

        const response = await submitGuessToServer(guess);
        if (!response) return;

        if (response.error) {
            if (response.error.includes("límite de 6 intentos") || response.error.includes("Ya has resuelto esta palabra")) {
                setErrorAttemptsExceeded(true);
                setGameStatus(GameStatus.Lost); // O GameStatus.Won si el error es "ya resuelto"
                return;
            } else {
                console.error("Error inesperado:", response.error);
                return;
            }
        }

        // Actualiza estados con respuesta válida
        const updatedLetterStatuses = [...letterStatuses];
        updatedLetterStatuses[currentRow] = response.letterStatuses.map(s => statusMap[s]);
        setLetterStatuses(updatedLetterStatuses);

        const updatedKeyStatuses = { ...keyStatuses };
        for (let i = 0; i < WORD_LENGTH; i++) {
            const char = guess[i];
            const status = updatedLetterStatuses[currentRow][i];
            // Solo actualiza si el nuevo estado es "mejor" (Correct > Present > Absent)
            if (!updatedKeyStatuses[char] || Object.values(LetterStatus).indexOf(updatedKeyStatuses[char]) < Object.values(LetterStatus).indexOf(status)) {
                updatedKeyStatuses[char] = status;
            }
        }
        setKeyStatuses(updatedKeyStatuses);

        let newStatus = gameStatus;
        if (response.isSolved) {
            newStatus = GameStatus.Won;
            setTargetWord(guess); // Revela la palabra al ganar
            await awardPoints(response.attempts); // Pasa el número de intento actual para los puntos
        } else if (response.attempts >= MAX_GUESSES) { // Usa response.attempts para verificar el límite
            newStatus = GameStatus.Lost;
        }

        setGameStatus(newStatus);

        const updatedGuesses = [...guesses];
        updatedGuesses[currentRow] = guess;
        setGuesses(updatedGuesses);

        saveGameState();

        if (newStatus === GameStatus.Playing) {
            setCurrentRow(currentRow + 1);
            setActiveCol(0);
        } else {
            setActiveCol(0); // Deshabilita la selección de columna si el juego terminó
        }
    }, [guesses, currentRow, submitGuessToServer, letterStatuses, keyStatuses, gameStatus, saveGameState, awardPoints, isPlaying]);

    const handleKeyPress = useCallback((key) => {
        if (!isPlaying || currentRow >= MAX_GUESSES) return;

        let newGuesses = [...guesses];
        let rowChars = newGuesses[currentRow].split('');
        let newActiveCol = activeCol;

        if (key === ENTER_KEY) {
            if (!rowChars.some(char => char === ' ')) { // Si la fila está completa
                submitGuess(newGuesses[currentRow]);
            }
        } else if (key === BACKSPACE_KEY) {
            if (activeCol > 0) {
                newActiveCol = activeCol - 1;
                rowChars[newActiveCol] = ' ';
            }
        } else if (/^[A-ZÑ]$/.test(key)) {
            if (activeCol < WORD_LENGTH) {
                rowChars[activeCol] = key;
                newActiveCol = activeCol + 1;
            }
        }

        newGuesses[currentRow] = rowChars.join('');
        setGuesses(newGuesses);
        setActiveCol(newActiveCol);
    }, [guesses, currentRow, activeCol, isPlaying, submitGuess]);

    const startNewGame = useCallback(async () => {
        setIsLoading(true);
        setErrorAttemptsExceeded(false);

        const daily = await getDailyWordFromServer();
        if (!daily) {
            setGameStatus(GameStatus.Lost); // No se pudo cargar la palabra
            setIsLoading(false);
            return;
        }

        setGameWordId(daily.gameWordId);

        // Si el backend indica que ya se excedieron los intentos o ya está resuelto
        if (daily.isSolved) {
            setTargetWord(daily.word); // La palabra ya está resuelta, la mostramos
            setGameStatus(GameStatus.Won);
            // Reconstruir el tablero para mostrar la palabra resuelta
            setGuesses([daily.word].concat(Array(MAX_GUESSES - 1).fill(' '.repeat(WORD_LENGTH))));
            setLetterStatuses([Array(WORD_LENGTH).fill(LetterStatus.Correct)].concat(Array(MAX_GUESSES - 1).fill(Array(WORD_LENGTH).fill(LetterStatus.Default))));
            setCurrentRow(daily.attemptsUsed); // Establecer la fila actual a los intentos usados
            setActiveCol(0);
            setIsLoading(false);
            return;
        } else if (daily.attemptsUsed >= MAX_GUESSES) {
            setErrorAttemptsExceeded(true);
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        const userId = localStorage.getItem('userId');
        const savedState = JSON.parse(localStorage.getItem(`wordGuessState_${daily.gameWordId}_${userId}`) || 'null');

        // Lógica para decidir si cargar el estado guardado o inicializar desde los intentos del backend
        let initialCurrentRow = daily.attemptsUsed; // Por defecto, usa los intentos del backend
        let initialGuesses = Array(MAX_GUESSES).fill(' '.repeat(WORD_LENGTH));
        let initialLetterStatuses = Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill(LetterStatus.Default));
        let initialKeyStatuses = {};
        let initialGameStatus = GameStatus.Playing;
        let initialTargetWord = ''; // Por defecto, la palabra no está revelada

        if (savedState && savedState.CurrentRow >= daily.attemptsUsed) {
            // Cargar estado guardado si existe y no está "atrasado" con respecto al backend
            initialGuesses = savedState.Guesses;
            initialCurrentRow = savedState.CurrentRow;
            initialGameStatus = savedState.GameStatus;
            initialLetterStatuses = savedState.LetterStatuses;
            // initialTargetWord = savedState.TargetWord; // No guardar targetWord en localStorage para mantenerlo oculto

            // Reconstruir keyStatuses desde savedLetterStatuses
            const newKeyStatuses = {};
            savedState.Guesses.forEach((guess, r) => {
                if (r < savedState.CurrentRow) { // Solo procesar filas ya enviadas
                    guess.split('').forEach((char, c) => {
                        if (char !== ' ' && savedState.LetterStatuses[r] && savedState.LetterStatuses[r][c] !== undefined) {
                            const status = savedState.LetterStatuses[r][c];
                            // Asegura que el estado de la tecla solo "mejora" (Correct > Present > Absent)
                            if (!newKeyStatuses[char] || Object.values(LetterStatus).indexOf(newKeyStatuses[char]) < Object.values(LetterStatus).indexOf(status)) {
                                newKeyStatuses[char] = status;
                            }
                        }
                    });
                }
            });
            initialKeyStatuses = newKeyStatuses;

            // Ajustar activeCol para la fila actual
            let newActiveCol = savedState.Guesses[initialCurrentRow].indexOf(' ');
            if (newActiveCol === -1 && initialCurrentRow < MAX_GUESSES) { // Si la fila actual está llena, avanza a la siguiente
                initialCurrentRow++;
                newActiveCol = 0;
            } else if (newActiveCol === -1 && initialCurrentRow === MAX_GUESSES) {
                // Si la última fila está llena y el juego no ha terminado, deshabilitar entrada
                newActiveCol = WORD_LENGTH;
            }
            setActiveCol(newActiveCol); // Establece activeCol basado en la fila actual
        } else {
            // Si no hay estado guardado válido o está desactualizado, inicializar desde daily.attemptsUsed
            // Las adivinanzas y los estados de las letras se reiniciarán, ya que el backend no los proporciona para intentos pasados.
            setActiveCol(0);
        }

        setTargetWord(initialTargetWord);
        setGuesses(initialGuesses);
        setCurrentRow(initialCurrentRow);
        setGameStatus(initialGameStatus);
        setLetterStatuses(initialLetterStatuses);
        setKeyStatuses(initialKeyStatuses);
        setIsLoading(false);
    }, [getDailyWordFromServer]);


    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER') handleKeyPress(ENTER_KEY);
            else if (key === 'BACKSPACE' || e.key === 'Backspace') handleKeyPress(BACKSPACE_KEY);
            else if (/^[A-ZÑ]$/.test(key) && key.length === 1) handleKeyPress(key);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyPress]);

    const getCellClass = (row, col) => {
        let classes = ['cell', 'flex', 'items-center', 'justify-center', 'text-2xl', 'font-bold', 'uppercase', 'w-12', 'h-12', 'rounded-md', 'border-2', 'transition-all', 'duration-300'];
        const status = letterStatuses[row] && letterStatuses[row][col] !== undefined ? letterStatuses[row][col] : LetterStatus.Default;

        switch (status) {
            case LetterStatus.Correct:
                classes = [...classes, 'bg-green-600', 'border-green-600', 'text-white'];
                break;
            case LetterStatus.Present:
                classes = [...classes, 'bg-yellow-500', 'border-yellow-500', 'text-white'];
                break;
            case LetterStatus.Absent:
                classes = [...classes, 'bg-gray-700', 'border-gray-700', 'text-white'];
                break;
            default:
                classes = [...classes, 'bg-gray-900', 'text-gray-200', 'border-gray-600'];
        }

        if (row === currentRow && col === activeCol && isPlaying) {
            classes = [...classes, '!border-blue-500', 'animate-pulse'];
        }

        return classes.join(' ');
    };

    const getKeyClass = (key) => {
        let classes = ['key', 'p-3', 'rounded-md', 'text-lg', 'font-bold', 'uppercase', 'cursor-pointer', 'transition-colors', 'duration-200', 'select-none'];
        const status = keyStatuses[key];

        switch (status) {
            case LetterStatus.Correct:
                classes = [...classes, 'bg-green-600', 'text-white'];
                break;
            case LetterStatus.Present:
                classes = [...classes, 'bg-yellow-500', 'text-white'];
                break;
            case LetterStatus.Absent:
                classes = [...classes, 'bg-gray-700', 'text-white'];
                break;
            default:
                classes = [...classes, 'bg-gray-600', 'hover:bg-gray-500', 'text-white'];
        }

        return classes.join(' ');
    };

    const handleCellClick = (row, col) => {
        if (row === currentRow && isPlaying) {
            setActiveCol(col);
        }
    };

    return (
        <div className="flex flex-col items-center justify-start p-6 bg-gray-950 text-white min-h-screen">
            <h3 className="text-3xl font-extrabold text-blue-400 mb-6">Adivina la Palabra</h3>

            {/* Descripción del sistema de puntos */}
            <div className="text-center mb-4 p-3 bg-gray-800 rounded-lg text-gray-300 text-sm max-w-md">
                <p className="font-semibold text-base mb-1">Gana puntos adivinando la palabra en el menor número de intentos:</p>
                <ul className="list-disc list-inside text-left mx-auto max-w-max">
                    <li>1er intento: <strong className="text-green-400">500 pts</strong></li>
                    <li>2do intento: <strong className="text-green-400">400 pts</strong></li>
                    <li>3er intento: <strong className="text-green-400">300 pts</strong></li>
                    <li>4to intento: <strong className="text-yellow-400">200 pts</strong></li>
                    <li>5to intento: <strong className="text-yellow-400">100 pts</strong></li>
                    <li>6to intento: <strong className="text-orange-400">50 pts</strong></li>
                </ul>
            </div>

            {isLoading ? (
                <div className="text-xl text-blue-400">
                    <lucide.Loader2 className="animate-spin inline-block mr-2" size={24} />
                    Cargando palabra...
                </div>
            ) : (
                <>
                    {/* Mensaje de límite de intentos */}
                    {errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            Has alcanzado el límite de {MAX_GUESSES} intentos sin resolver la palabra. No puedes seguir jugando hoy.
                        </div>
                    )}

                    {/* Tablero */}
                    <div className="board grid gap-2" style={{
                        gridTemplateColumns: `repeat(${WORD_LENGTH}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${MAX_GUESSES}, minmax(0, 1fr))`,
                    }}>
                        {guesses.flatMap((row, rowIndex) =>
                            row.split('').map((char, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={getCellClass(rowIndex, colIndex)}
                                    onClick={() => handleCellClick(rowIndex, colIndex)}
                                >
                                    {char !== ' ' ? char : ''}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Teclado en pantalla */}
                    <div className="keyboard mt-6 w-full max-w-lg">
                        {["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"].map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center my-1 space-x-1">
                                {row.split('').map((key) => (
                                    <button
                                        key={key}
                                        className={getKeyClass(key)}
                                        onClick={() => handleKeyPress(key)}
                                        disabled={!isPlaying}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>
                        ))}
                        <div className="flex justify-center my-1 space-x-1">
                            <button className={`${getKeyClass(BACKSPACE_KEY)} flex-grow`} onClick={() => handleKeyPress(BACKSPACE_KEY)} disabled={!isPlaying}>⌫</button>
                            <button className={`${getKeyClass(ENTER_KEY)} flex-grow`} onClick={() => handleKeyPress(ENTER_KEY)} disabled={!isPlaying}>ENTER</button>
                        </div>
                    </div>

                    {/* Mensajes de resultado */}
                    <div className="mt-4 text-center">
                        {!isPlaying && !errorAttemptsExceeded && (
                            <div className="result-message mb-3">
                                {gameStatus === GameStatus.Won ? (
                                    <div className="bg-green-600 p-4 rounded-lg">
                                        <h4 className="text-xl font-bold">¡Ganaste!</h4>
                                        <p>La palabra era: <strong>{targetWord}</strong></p>
                                    </div>
                                ) : (
                                    <div className="bg-red-600 p-4 rounded-lg">
                                        <h4 className="text-xl font-bold">¡Perdiste!</h4>
                                        <p>La palabra era: <strong>{targetWord}</strong></p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
