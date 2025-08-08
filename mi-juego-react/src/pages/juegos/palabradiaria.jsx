import React, { useState, useEffect, useCallback } from 'react';
import * as lucide from 'lucide-react';
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
const GameStatus = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost'
};
// Función para normalizar palabras (quita tildes y pasa a mayúsculas)
const normalizeWord = (word) =>
    word.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
export default function PalabraDiaria({ onLogout }) {
    const [gameWordId, setGameWordId] = useState(0);
    const [targetWord, setTargetWord] = useState('');
    const [guesses, setGuesses] = useState(Array(MAX_GUESSES).fill(' '.repeat(WORD_LENGTH)));
    const [currentRow, setCurrentRow] = useState(0);
    const [activeCol, setActiveCol] = useState(0);
    const [gameStatus, setGameStatus] = useState(GameStatus.Playing);
    const [keyStatuses, setKeyStatuses] = useState({});
    const [letterStatuses, setLetterStatuses] = useState(
        Array(MAX_GUESSES).fill(Array(WORD_LENGTH).fill(LetterStatus.Default))
    );
    const [isLoading, setIsLoading] = useState(true);
    const [errorAttemptsExceeded, setErrorAttemptsExceeded] = useState(false);
    const isPlaying = gameStatus === GameStatus.Playing && !errorAttemptsExceeded;
    // Calcular letterStatuses localmente
    const getGuessLetterStatusesLocal = useCallback((guess, target) => {
        const statusList = Array(target.length).fill(LetterStatus.Absent);
        const targetChars = target.split('');
        const guessChars = guess.split('');
        const used = Array(target.length).fill(false);
        // Paso 1: letras correctas
        for (let i = 0; i < target.length; i++) {
            if (guessChars[i] === targetChars[i]) {
                statusList[i] = LetterStatus.Correct;
                used[i] = true;
            }
        }
        // Paso 2: letras presentes
        for (let i = 0; i < target.length; i++) {
            if (statusList[i] === LetterStatus.Correct) continue;
            for (let j = 0; j < target.length; j++) {
                if (!used[j] && guessChars[i] === targetChars[j]) {
                    statusList[i] = LetterStatus.Present;
                    used[j] = true;
                    break;
                }
            }
        }
        return statusList;
    }, []);
    // ---------- CAMBIO: submitGuessToServer ahora acepta isSolved y attemptsUsed ----------
    const submitGuessToServer = useCallback(async (guess, isSolved = false, attemptsUsed = null) => {
        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                onLogout();
                return null;
            }
            const requestBody = { 
                GameWordId: gameWordId, 
                Guess: guess, 
                IsSolved: isSolved ? 1 : 0 
            };
            if (attemptsUsed !== null) requestBody.AttemptsUsed = attemptsUsed;
            console.log("Enviando intento al servidor:", requestBody);
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/game/guess`, {
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
            const json = await response.json();
            console.log("Respuesta servidor:", json);
            return json;
        } catch (error) {
            console.error('Error enviando intento:', error);
            return null;
        }
    }, [gameWordId, onLogout]);
    // -------------------------------------------------------------------------------------
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
            // Diccionario
            let dictionary = JSON.parse(localStorage.getItem('wordDictionary'));
            if (!dictionary) {
                const resDict = await fetch(`${import.meta.env.VITE_API_URL}/api/game/dictionary`, {
                    headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
                });
                dictionary = await resDict.json();
                dictionary = dictionary.map(w => normalizeWord(w));
                localStorage.setItem('wordDictionary', JSON.stringify(dictionary));
            }
            // Palabra diaria
            let daily = JSON.parse(localStorage.getItem('dailyWord'));
            if (!daily || daily.date !== new Date().toISOString().split('T')[0]) {
                const resDaily = await fetch(`${import.meta.env.VITE_API_URL}/api/game/dailyword`, {
                    headers: { Authorization: "Bearer " + token.replace(/"/g, '') },
                });
                daily = await resDaily.json();
                daily.word = normalizeWord(daily.word); // Normalizar la palabra al guardar
                daily.date = new Date().toISOString().split('T')[0]; // Guardar la fecha para la validación del día
                localStorage.setItem('dailyWord', JSON.stringify(daily));
            }
            setTargetWord(daily.word);
            setGameWordId(daily.gameWordId);
            // Restaurar progreso guardado
            const savedGuesses = JSON.parse(localStorage.getItem('guessedWords') || '[]');
            const savedStatuses = JSON.parse(localStorage.getItem('letterStatuses') || '[]');
            if (savedGuesses.length > 0) {
                setGuesses(prev => {
                    const updated = [...prev];
                    savedGuesses.forEach((w, i) => updated[i] = w);
                    return updated;
                });
                if (savedStatuses.length > 0) {
                    setLetterStatuses(savedStatuses);
                }
                setCurrentRow(savedGuesses.length);
            } else {
                setCurrentRow(daily.attemptsUsed);
            }
            if (daily.isSolved) {
                setGameStatus(GameStatus.Won);
                // ✅ Eliminado: awardPoints(daily.attemptsUsed);
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
        if (guess.length !== WORD_LENGTH) return;
        if (!isPlaying) return;
        const dictionary = JSON.parse(localStorage.getItem('wordDictionary')) || [];
        const daily = JSON.parse(localStorage.getItem('dailyWord'));
        const normalizedGuess = normalizeWord(guess);
        if (!dictionary.includes(normalizedGuess)) {
            alert("La palabra no está en el diccionario.");
            return;
        }
        const normalizedTarget = daily.word; // Ya está normalizada
        // Guardar intento
        let guessedWords = JSON.parse(localStorage.getItem('guessedWords') || '[]');
        guessedWords[currentRow] = normalizedGuess;
        localStorage.setItem('guessedWords', JSON.stringify(guessedWords));
        // Calcular estados localmente
        const localStatuses = getGuessLetterStatusesLocal(normalizedGuess, normalizedTarget);
        // Actualizar tablero
        const updatedGuesses = [...guesses];
        updatedGuesses[currentRow] = normalizedGuess;
        setGuesses(updatedGuesses);
        const updatedLetterStatuses = [...letterStatuses];
        updatedLetterStatuses[currentRow] = localStatuses;
        setLetterStatuses(updatedLetterStatuses);
        localStorage.setItem('letterStatuses', JSON.stringify(updatedLetterStatuses));
        // Actualizar teclado
        const updatedKeyStatuses = { ...keyStatuses };
        normalizedGuess.split('').forEach((char, idx) => {
            const status = localStatuses[idx];
            if (!updatedKeyStatuses[char] ||
                Object.values(LetterStatus).indexOf(updatedKeyStatuses[char]) <
                Object.values(LetterStatus).indexOf(status)) {
                updatedKeyStatuses[char] = status;
            }
        });
        setKeyStatuses(updatedKeyStatuses);
        const isCorrect = normalizedGuess === normalizedTarget;
        if (isCorrect) {
            setGameStatus(GameStatus.Won);
            // ✅ Actualizar el localStorage y otorgar puntos
            let updatedDaily = { ...daily, isSolved: true, attemptsUsed: currentRow + 1 };
            localStorage.setItem('dailyWord', JSON.stringify(updatedDaily));
            awardPoints(currentRow + 1);
        } else if (currentRow + 1 >= MAX_GUESSES) {
            setGameStatus(GameStatus.Lost);
        }
        // Avanzar fila
        setCurrentRow(prev => {
            const newRow = prev + 1;
            setActiveCol(0);
            return newRow;
        });
        // ---------- CAMBIO: ahora pasamos isCorrect y attemptsUsed ----------
        submitGuessToServer(normalizedGuess, isCorrect, currentRow + 1).then(response => {
            if (!response) return;
            if (response.isSolved) {
                // Aquí ya no hace falta llamar a awardPoints porque ya se hizo en el frontend
            } else if (response.attempts >= MAX_GUESSES) {
                setGameStatus(GameStatus.Lost);
            }
        });
        // ------------------------------------------------------------------
    }, [currentRow, guesses, isPlaying, keyStatuses, letterStatuses, submitGuessToServer, awardPoints, getGuessLetterStatusesLocal]);
    const handleKeyPress = useCallback((key) => {
        if (!isPlaying || currentRow >= MAX_GUESSES) return;
        let newGuesses = [...guesses];
        let rowChars = newGuesses[currentRow].split('');
        let newActiveCol = activeCol;
        if (key === ENTER_KEY) {
            if (!rowChars.some(char => char === ' ')) {
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
    useEffect(() => { loadInitialData(); }, [loadInitialData]);
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
        let classes = ['cell', 'flex', 'items-center', 'justify-center', 'text-2xl', 'font-bold', 'uppercase', 'w-12', 'h-12', 'rounded-md', 'border-2'];
        const status = letterStatuses[row]?.[col] ?? LetterStatus.Default;
        switch (status) {
            case LetterStatus.Correct: classes.push('bg-green-600', 'border-green-600', 'text-white'); break;
            case LetterStatus.Present: classes.push('bg-yellow-500', 'border-yellow-500', 'text-white'); break;
            case LetterStatus.Absent: classes.push('bg-gray-700', 'border-gray-700', 'text-white'); break;
            default: classes.push('bg-gray-900', 'text-gray-200', 'border-gray-600');
        }
        if (row === currentRow && col === activeCol && isPlaying) {
            classes.push('!border-blue-500', 'animate-pulse');
        }
        return classes.join(' ');
    };
    const getKeyClass = (key) => {
        let classes = ['key', 'p-3', 'rounded-md', 'text-lg', 'font-bold', 'cursor-pointer', 'select-none'];
        const status = keyStatuses[key];
        switch (status) {
            case LetterStatus.Correct: classes.push('bg-green-600', 'text-white'); break;
            case LetterStatus.Present: classes.push('bg-yellow-500', 'text-white'); break;
            case LetterStatus.Absent: classes.push('bg-gray-700', 'text-white'); break;
            default: classes.push('bg-gray-600', 'hover:bg-gray-500', 'text-white');
        }
        return classes.join(' ');
    };
    return (
        <div className="flex flex-col items-center justify-start p-6 bg-gray-950 text-white min-h-screen">
            <h3 className="text-3xl font-extrabold text-blue-400 mb-6">Adivina la Palabra</h3>
            {isLoading ? (
                <div className="text-xl text-blue-400">
                    <lucide.Loader2 className="animate-spin inline-block mr-2" size={24} />
                    Cargando palabra...
                </div>
            ) : (
                <>
                    {gameStatus === GameStatus.Lost && !errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            ¡Perdiste! La palabra era: <strong className="uppercase">{targetWord}</strong>
                        </div>
                    )}
                    {gameStatus === GameStatus.Won && (
                        <div className="bg-green-600 p-4 rounded-lg my-4 text-center text-white font-bold">
                            ¡Ganaste! La palabra era: <strong className="uppercase">{targetWord}</strong>
                        </div>
                    )}
                    {errorAttemptsExceeded && (
                        <div className="bg-red-700 p-4 rounded-lg my-4 text-center text-white font-bold">
                            Has alcanzado el límite de {MAX_GUESSES} intentos sin resolver la palabra.
                        </div>
                    )}
                    <div className="board grid gap-2" style={{
                        gridTemplateColumns: `repeat(${WORD_LENGTH}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${MAX_GUESSES}, minmax(0, 1fr))`,
                    }}>
                        {guesses.flatMap((row, rowIndex) =>
                            (row || ' '.repeat(WORD_LENGTH)).split('').map((char, colIndex) => (
                                <div key={`${rowIndex}-${colIndex}`} className={getCellClass(rowIndex, colIndex)}>
                                    {char !== ' ' ? char : ''}
                                </div>
                            ))
                        )}
                    </div>
                    <div className="keyboard mt-6 w-full max-w-lg">
                        {["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"].map((row, rowIndex) => (
                            <div key={rowIndex} className="flex justify-center my-1 space-x-1">
                                {row.split('').map((key) => (
                                    <button key={key} className={getKeyClass(key)} onClick={() => handleKeyPress(key)} disabled={!isPlaying}>
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
                    <div className="mt-8 bg-gray-800 p-4 rounded-lg max-w-md w-full text-sm text-gray-200">
  <h4 className="text-lg font-bold text-purple-400 mb-2">Reglas del juego</h4>
  <ul className="list-disc list-inside mb-4">
    <li>Adivina la palabra de 5 letras.</li>
    <li>Tienes hasta 6 intentos.</li>
    <li>Las letras correctas en posición correcta se muestran en verde.</li>
    <li>Las letras correctas en posición incorrecta se muestran en amarillo.</li>
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
