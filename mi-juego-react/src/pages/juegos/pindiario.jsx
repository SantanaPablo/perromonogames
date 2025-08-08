import React, { useState, useEffect, useCallback } from 'react';
import * as lucide from 'lucide-react';

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

    const getGuessDigitStatusesLocal = useCallback((guess, target) => {
        const statusList = Array(target.length).fill(DigitStatus.Absent);
        const targetDigits = target.split('');
        const guessDigits = guess.split('');
        const used = Array(target.length).fill(false);

        for (let i = 0; i < target.length; i++) {
            if (guessDigits[i] === targetDigits[i]) {
                statusList[i] = DigitStatus.Correct;
                used[i] = true;
            }
        }
        for (let i = 0; i < target.length; i++) {
            if (statusList[i] === DigitStatus.Correct) continue;
            for (let j = 0; j < target.length; j++) {
                if (!used[j] && guessDigits[i] === targetDigits[j]) {
                    statusList[i] = DigitStatus.Present;
                    used[j] = true;
                    break;
                }
            }
        }
        return statusList;
    }, []);

 const submitGuessToServer = useCallback(async (guess, isSolved = false, attemptsUsed = null) => {
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout();
            return null;
        }

        const requestBody = { 
            GamePinId: gamePinId, 
            Guess: guess, 
            IsSolved: isSolved ? 1 : 0 
        };
        if (attemptsUsed !== null) requestBody.AttemptsUsed = attemptsUsed;

        console.log("Enviando intento al servidor:", requestBody);

        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/GamePin/guess`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            if (response.status === 401) onLogout();
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Error enviando intento:', error);
        return null;
    }
}, [gamePinId, onLogout]);

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

            if (response.ok) {
                const data = await response.json();
                console.log(`Puntos sumados (${pointsToAward}). Total:`, data.totalPoints);
            } else {
                console.error('Error al sumar puntos:', response.status);
            }
        } catch (ex) {
            console.error(`Error al sumar puntos: ${ex.message}`);
        }
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            if (!token) return onLogout();

            let daily = JSON.parse(localStorage.getItem('dailyPin'));
            if (!daily || daily.date !== new Date().toISOString().split('T')[0]) {
                const resDaily = await fetch(`${import.meta.env.VITE_API_URL}/api/GamePin/dailypin`, {
                    headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
                });
                daily = await resDaily.json();
                daily.date = new Date().toISOString().split('T')[0];
                localStorage.setItem('dailyPin', JSON.stringify(daily));
            }

            setGamePinId(daily.gamePinId);
            setTargetPin(daily.pin);

            const savedGuesses = JSON.parse(localStorage.getItem('guessedPins') || '[]');
            const savedStatuses = JSON.parse(localStorage.getItem('digitStatuses') || '[]');

            if (savedGuesses.length > 0) {
                setGuesses(prev => {
                    const updated = [...prev];
                    savedGuesses.forEach((w, i) => updated[i] = (w ?? ' '.repeat(PIN_LENGTH)));
                    return updated;
                });

                if (savedStatuses.length > 0) {
                    setDigitStatuses(savedStatuses);
                }

                setCurrentRow(savedGuesses.length);
            } else {
                setCurrentRow(daily.attemptsUsed);
            }

            if (daily.isSolved) {
                setGameStatus(GameStatus.Won);
            } else if (daily.attemptsUsed >= MAX_GUESSES) {
                setErrorAttemptsExceeded(true);
                setGameStatus(GameStatus.Lost);
            }
        } catch (err) {
            console.error("Error inicial:", err);
        } finally {
            setIsLoading(false);
        }
    }, [onLogout]);

    const submitGuess = useCallback((guess) => {
        if (guess.length !== PIN_LENGTH) return;
        if (!isPlaying) return;

        const daily = JSON.parse(localStorage.getItem('dailyPin'));
        const isCorrect = guess === daily.pin;

        // Guardar intento localmente
        let guessedPins = JSON.parse(localStorage.getItem('guessedPins') || '[]');
        guessedPins[currentRow] = guess;
        localStorage.setItem('guessedPins', JSON.stringify(guessedPins));

        // Calcular estados localmente y actualizar UI
        const localStatuses = getGuessDigitStatusesLocal(guess, daily.pin);
        const updatedGuesses = [...guesses];
        updatedGuesses[currentRow] = guess;
        setGuesses(updatedGuesses);

        const updatedDigitStatuses = [...digitStatuses];
        updatedDigitStatuses[currentRow] = localStatuses;
        setDigitStatuses(updatedDigitStatuses);
        localStorage.setItem('digitStatuses', JSON.stringify(updatedDigitStatuses));

        const updatedKeyStatuses = { ...keyStatuses };
        guess.split('').forEach((char, idx) => {
            const status = localStatuses[idx];
            if (!updatedKeyStatuses[char] ||
                Object.values(DigitStatus).indexOf(updatedKeyStatuses[char]) < Object.values(DigitStatus).indexOf(status)) {
                updatedKeyStatuses[char] = status;
            }
        });
        setKeyStatuses(updatedKeyStatuses);

        // Actualizar el estado del juego y la fila
        if (isCorrect) {
            setGameStatus(GameStatus.Won);
            // Actualizar el localStorage para que se muestre el estado correcto al recargar
            let updatedDaily = { ...daily, isSolved: true, attemptsUsed: currentRow + 1 };
            localStorage.setItem('dailyPin', JSON.stringify(updatedDaily));
            awardPoints(currentRow + 1);
        } else if (currentRow + 1 >= MAX_GUESSES) {
            setGameStatus(GameStatus.Lost);
        }
        
        setCurrentRow(prev => {
            const newRow = prev + 1;
            setActiveCol(0);
            return newRow;
        });

        // Enviar a servidor en segundo plano
        submitGuessToServer(guess).then(response => {
            if (!response) return;
            if (response.isSolved) {
                // Aquí ya no hace falta llamar a awardPoints porque ya se hizo en el frontend
            } else if (response.attempts >= MAX_GUESSES) {
                setGameStatus(GameStatus.Lost);
            }
        });
    }, [currentRow, guesses, isPlaying, keyStatuses, digitStatuses, submitGuessToServer, awardPoints, getGuessDigitStatusesLocal]);

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

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

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
                <div className="text-xl text-purple-400">
                    <lucide.Loader2 className="animate-spin inline-block mr-2" size={24} />
                    Cargando PIN...
                </div>
            ) : (
                <>
                    {gameStatus === GameStatus.Lost && !errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            ¡Perdiste! El PIN era: <strong>{targetPin}</strong>
                        </div>
                    )}
                    {gameStatus === GameStatus.Won && (
                        <div className="bg-green-600 p-4 rounded-lg my-4 text-center text-white font-bold">
                            ¡Ganaste! El PIN era: <strong>{targetPin}</strong>
                        </div>
                    )}
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
                            (row || ' '.repeat(PIN_LENGTH)).split('').map((char, colIndex) => (
                                <div
                                    key={`${rowIndex}-${colIndex}`}
                                    className={getCellClass(rowIndex, colIndex)}
                                    onClick={() => {
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
                    <div className="mt-8 bg-gray-800 p-4 rounded-lg max-w-md w-full text-sm text-gray-200">
  <h4 className="text-lg font-bold text-purple-400 mb-2">Reglas del juego</h4>
  <ul className="list-disc list-inside mb-4">
    <li>Adivina el pin de 4 dígitos.</li>
    <li>Tienes hasta 6 intentos.</li>
    <li>Los dígitos en posición correcta se muestran en verde.</li>
    <li>Los dígitos en posición incorrecta se muestran en amarillo.</li>
  </ul>
  <h4 className="text-lg font-bold text-purple-400 mb-2">Puntos</h4>
  <table className="w-full text-center border-collapse border border-gray-600">
    <thead>
      <tr className="bg-gray-700">
        <th className="border border-gray-600 p-1">Intento</th>
        <th className="border border-gray-600 p-1">Puntos</th>
      </tr>
    </thead>
    <tbody>
      <tr><td className="border border-gray-600 p-1">1</td><td className="border border-gray-600 p-1">500</td></tr>
      <tr><td className="border border-gray-600 p-1">2</td><td className="border border-gray-600 p-1">400</td></tr>
      <tr><td className="border border-gray-600 p-1">3</td><td className="border border-gray-600 p-1">300</td></tr>
      <tr><td className="border border-gray-600 p-1">4</td><td className="border border-gray-600 p-1">200</td></tr>
      <tr><td className="border border-gray-600 p-1">5</td><td className="border border-gray-600 p-1">100</td></tr>
      <tr><td className="border border-gray-600 p-1">6</td><td className="border border-gray-600 p-1">50</td></tr>
    </tbody>
  </table>
</div>


                </>
            )}
        </div>
    );
}