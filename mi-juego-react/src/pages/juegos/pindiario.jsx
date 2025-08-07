import React, { useState, useEffect, useCallback } from 'react';
import * as lucide from 'lucide-react'; // Para el icono de carga

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
    const [targetPin, setTargetPin] = useState(''); // Solo se llenará si el PIN es resuelto
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
                console.error('Error al obtener PIN del día:', response.statusText);
                return null;
            }

            const data = await response.json();
            // data ahora incluye 'attemptsUsed' del backend
            return data;

        } catch (error) {
            console.error('Error al obtener PIN del día:', error);
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
                return { error: errorContent };
            }

            return await response.json();

        } catch (error) {
            console.error('Error al enviar intento:', error);
            return { error: error.message };
        }
    }, [gamePinId, onLogout]);

    const awardPoints = useCallback(async (attempts) => { // Recibe el número de intentos
        let pointsToAward = 0;
        // Lógica de puntos para el PIN, puedes ajustarla si es diferente a la palabra
        // Por ejemplo, un valor fijo o una escala similar a la palabra
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

            if (response.ok) {
                const data = await response.json();
                console.log(`Puntos sumados con éxito (${pointsToAward}). Total:`, data.totalPoints);
            } else {
                console.error('Error al sumar puntos:', response.status);
            }

        } catch (ex) {
            console.error(`Error al sumar puntos: ${ex.message}`);
        }
    }, []);

    const saveGameState = useCallback(() => {
        const userId = localStorage.getItem('userId');
        const state = {
            // targetPin no se guarda porque solo se revela al ganar
            Guesses: guesses,
            CurrentRow: currentRow,
            GameStatus: gameStatus,
            DigitStatuses: digitStatuses
        };
        localStorage.setItem(`pinGuessState_${gamePinId}_${userId}`, JSON.stringify(state));
    }, [guesses, currentRow, gameStatus, digitStatuses, gamePinId]);

    const submitGuess = useCallback(async (guess) => {
        if (guess.length !== PIN_LENGTH || !/^\d+$/.test(guess)) return;
        if (!isPlaying) return;

        const response = await submitGuessToServer(guess);
        if (!response) return;

        // Comprobación de error de intentos excedidos del servidor
        if (response.error) {
            if (response.error.includes("límite de 6 intentos") || response.error.includes("Ya has resuelto este PIN")) {
                setErrorAttemptsExceeded(true);
                setGameStatus(GameStatus.Lost); // O GameStatus.Won si el error es "ya resuelto"
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
            // Solo actualiza si el nuevo estado es "mejor" (Correct > Present > Absent)
            if (!updatedKeyStatuses[digit] || Object.values(DigitStatus).indexOf(updatedKeyStatuses[digit]) < Object.values(DigitStatus).indexOf(status)) {
                updatedKeyStatuses[digit] = status;
            }
        }
        setKeyStatuses(updatedKeyStatuses);

        let newStatus = gameStatus;
        if (response.isSolved) {
            newStatus = GameStatus.Won;
            setTargetPin(guess); // Revela el PIN al ganar
            await awardPoints(response.attempts); // Pasa el número de intento actual para los puntos
        } else if (response.attempts >= MAX_GUESSES) { // Usa response.attempts para verificar el límite
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
            setActiveCol(0); // Deshabilita la selección de columna si el juego terminó
        }
    }, [guesses, currentRow, submitGuessToServer, digitStatuses, keyStatuses, gameStatus, saveGameState, awardPoints, isPlaying]);

    const handleKeyPress = useCallback((key) => {
        if (!isPlaying || currentRow >= MAX_GUESSES) return;

        let newGuesses = [...guesses];
        let rowDigits = newGuesses[currentRow].split('');
        let newActiveCol = activeCol;

        if (key === ENTER_KEY && !rowDigits.includes(' ')) { // Si la fila está completa
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
            setGameStatus(GameStatus.Lost); // No se pudo cargar el PIN
            setIsLoading(false);
            return;
        }

        setGamePinId(dailyPinInfo.gamePinId);

        // Si el backend indica que ya se excedieron los intentos o ya está resuelto
        if (dailyPinInfo.isSolved) {
            setTargetPin(dailyPinInfo.pin); // El PIN ya está resuelto, lo mostramos
            setGameStatus(GameStatus.Won);
            // Reconstruir el tablero para mostrar el PIN resuelto
            setGuesses([dailyPinInfo.pin].concat(Array(MAX_GUESSES - 1).fill(' '.repeat(PIN_LENGTH))));
            setDigitStatuses([Array(PIN_LENGTH).fill(DigitStatus.Correct)].concat(Array(MAX_GUESSES - 1).fill(Array(PIN_LENGTH).fill(DigitStatus.Default))));
            setCurrentRow(dailyPinInfo.attemptsUsed); // Establecer la fila actual a los intentos usados
            setActiveCol(0);
            setIsLoading(false);
            return;
        } else if (dailyPinInfo.attemptsUsed >= MAX_GUESSES) {
            setErrorAttemptsExceeded(true);
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        const userId = localStorage.getItem('userId');
        const savedState = JSON.parse(localStorage.getItem(`pinGuessState_${dailyPinInfo.gamePinId}_${userId}`) || 'null');

        // Lógica para decidir si cargar el estado guardado o inicializar desde los intentos del backend
        let initialCurrentRow = dailyPinInfo.attemptsUsed; // Por defecto, usa los intentos del backend
        let initialGuesses = Array(MAX_GUESSES).fill(' '.repeat(PIN_LENGTH));
        let initialDigitStatuses = Array(MAX_GUESSES).fill(Array(PIN_LENGTH).fill(DigitStatus.Default));
        let initialKeyStatuses = {};
        let initialGameStatus = GameStatus.Playing;
        let initialTargetPin = ''; // Por defecto, el PIN no está revelado

        if (savedState && savedState.CurrentRow >= dailyPinInfo.attemptsUsed) {
            // Cargar estado guardado si existe y no está "atrasado" con respecto al backend
            initialGuesses = savedState.Guesses;
            initialCurrentRow = savedState.CurrentRow;
            initialGameStatus = savedState.GameStatus;
            initialDigitStatuses = savedState.DigitStatuses;
            // initialTargetPin = savedState.TargetPin; // No guardar targetPin en localStorage para mantenerlo oculto

            // Reconstruir keyStatuses desde savedDigitStatuses
            const newKeyStatuses = {};
            savedState.Guesses.forEach((guess, r) => {
                if (r < savedState.CurrentRow) { // Solo procesar filas ya enviadas
                    guess.split('').forEach((digit, c) => {
                        if (digit !== ' ' && savedState.DigitStatuses[r] && savedState.DigitStatuses[r][c] !== undefined) {
                            const status = savedState.DigitStatuses[r][c];
                            // Asegura que el estado de la tecla solo "mejora" (Correct > Present > Absent)
                            if (!newKeyStatuses[digit] || Object.values(DigitStatus).indexOf(newKeyStatuses[digit]) < Object.values(DigitStatus).indexOf(status)) {
                                newKeyStatuses[digit] = status;
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
                newActiveCol = PIN_LENGTH;
            }
            setActiveCol(newActiveCol); // Establece activeCol basado en la fila actual
        } else {
            // Si no hay estado guardado válido o está desactualizado, inicializar desde dailyPinInfo.attemptsUsed
            // Las adivinanzas y los estados de los dígitos se reiniciarán, ya que el backend no los proporciona para intentos pasados.
            setActiveCol(0);
        }

        setTargetPin(initialTargetPin);
        setGuesses(initialGuesses);
        setCurrentRow(initialCurrentRow);
        setGameStatus(initialGameStatus);
        setDigitStatuses(initialDigitStatuses);
        setKeyStatuses(initialKeyStatuses);
        setIsLoading(false);
    }, [getDailyPinFromServer]);

    useEffect(() => { startNewGame(); }, [startNewGame]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key.toUpperCase();
            if (key === 'ENTER') handleKeyPress(ENTER_KEY);
            else if (key === 'BACKSPACE' || e.key === 'Backspace') handleKeyPress(BACKSPACE_KEY);
            else if (/^\d$/.test(key)) handleKeyPress(key); // Solo dígitos
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

            {/* Descripción del sistema de puntos */}
            <div className="text-center mb-4 p-3 bg-gray-800 rounded-lg text-gray-300 text-sm max-w-md">
                <p className="font-semibold text-base mb-1">Gana puntos adivinando el PIN en el menor número de intentos:</p>
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
                <div className="text-xl text-purple-400">
                    <lucide.Loader2 className="animate-spin inline-block mr-2" size={24} /> {/* Agregado el icono de carga */}
                    Cargando PIN...
                </div>
            ) : (
                <>
                    {errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            Has alcanzado el límite de {MAX_GUESSES} intentos sin resolver el PIN. No puedes seguir jugando hoy.
                        </div>
                    )}

                    <div className="grid gap-2" style={{
                        gridTemplateColumns: `repeat(${PIN_LENGTH}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${MAX_GUESSES}, minmax(0, 1fr))`,
                    }}>
                        {guesses.flatMap((row, rowIndex) =>
                            row.split('').map((char, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={getCellClass(rowIndex, colIndex)}
                                    onClick={() => {
                                        // Permite seleccionar la columna solo en la fila actual y si el juego está activo
                                        if (rowIndex === currentRow && isPlaying) {
                                            setActiveCol(colIndex);
                                        }
                                    }}
                                >
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
