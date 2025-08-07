import React, { useState, useEffect, useCallback } from 'react';
import * as lucide from 'lucide-react'; // Para el icono de carga

// Constantes del juego.
const MAX_INCORRECT_GUESSES = 6;
const LETTER_SET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";

// Posibles estados para una letra, para el teclado.
const LetterStatus = {
    Default: 'Default',
    Correct: 'Correct',
    Absent: 'Absent'
};

// Posibles estados del juego.
const GameStatus = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost'
};

// Función para normalizar letras (quitar tildes y convertir a mayúsculas)
const normalizeString = (str) => {
    if (!str) return '';
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
};

// Función para generar las imágenes SVG del ahorcado
const getHangmanImageSvg = (incorrectGuesses) => {
    // Base de la horca
    const gallowsBase = `<rect x="0" y="250" width="192" height="6" fill="#6B7280" rx="3"/>`;
    // Poste vertical
    const gallowsVertical = `<rect x="90" y="0" width="6" height="250" fill="#6B7280" rx="3"/>`;
    // Poste horizontal
    const gallowsHorizontal = `<rect x="90" y="0" width="100" height="6" fill="#6B7280" rx="3"/>`;
    // Cuerda
    const gallowsRope = `<rect x="186" y="0" width="6" height="48" fill="#6B7280" rx="3"/>`;

    // Partes del cuerpo
    const head = `<circle cx="189" cy="78" r="18" stroke="white" stroke-width="4"/>`;
    const body = `<line x1="189" y1="96" x2="189" y2="156" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    const rightArm = `<line x1="189" y1="110" x2="150" y2="130" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    const leftArm = `<line x1="189" y1="110" x2="228" y2="130" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    const rightLeg = `<line x1="189" y1="156" x2="160" y2="196" stroke="white" stroke-width="4" stroke-linecap="round"/>`;
    const leftLeg = `<line x1="189" y1="156" x2="218" y2="196" stroke="white" stroke-width="4" stroke-linecap="round"/>`;

    const bodyParts = [head, body, rightArm, leftArm, rightLeg, leftLeg];

    let currentDrawing = gallowsBase + gallowsVertical + gallowsHorizontal + gallowsRope; // Siempre dibujar la horca

    // Añadir partes del cuerpo según los fallos
    for (let i = 0; i < incorrectGuesses && i < bodyParts.length; i++) {
        currentDrawing += bodyParts[i];
    }

    // Envolver en un SVG completo y codificar en base64
    const fullSvg = `<svg width="240" height="260" viewBox="0 0 240 260" fill="none" xmlns="http://www.w3.org/2000/svg">${currentDrawing}</svg>`;
    return `data:image/svg+xml;base64,${btoa(fullSvg)}`;
};


// Componente para dibujar el ahorcado
const HangmanDrawing = ({ incorrectGuesses }) => {
    const svgSrc = getHangmanImageSvg(incorrectGuesses);
    return (
        <div className="relative w-60 h-64 flex items-end justify-center">
            <img src={svgSrc} alt="Hangman" className="w-full h-full object-contain" />
        </div>
    );
};

// Componente para el teclado
const Keyboard = ({ keyStatuses, onKeyClick, isPlaying }) => {
    const getKeyClass = (key) => {
        const baseClasses = `
            p-2 md:p-3 rounded-lg font-bold text-base md:text-lg transition-colors duration-200
            uppercase shadow-lg cursor-pointer select-none m-0.5 flex-grow
        `;

        switch (keyStatuses[key]) {
            case LetterStatus.Correct:
                return `${baseClasses} bg-green-600 text-white`;
            case LetterStatus.Absent:
                return `${baseClasses} bg-gray-700 text-white`;
            default:
                return `${baseClasses} bg-gray-600 text-white hover:bg-gray-500`;
        }
    };
    
    return (
        <div className="keyboard w-full max-w-lg mb-6">
            {["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"].map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center my-1">
                    {row.split('').map((key) => (
                        <button
                            key={key}
                            className={getKeyClass(key)}
                            onClick={() => onKeyClick(key)}
                            disabled={!isPlaying || keyStatuses[key] !== LetterStatus.Default}
                        >
                            {key}
                        </button>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default function Ahorcado({ onLogout }) {
    // --- Estado del juego ---
    const [gameWordId, setGameWordId] = useState(0);
    const [targetWord, setTargetWord] = useState('');
    const [originalWord, setOriginalWord] = useState('');
    const [guessedLetters, setGuessedLetters] = useState(new Set());
    const [incorrectlyGuessedLetters, setIncorrectlyGuessedLetters] = useState(new Set());
    const [gameStatus, setGameStatus] = useState(GameStatus.Playing);
    const [keyStatuses, setKeyStatuses] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [startTime, setStartTime] = useState(null);
    const [wordTemplate, setWordTemplate] = useState([]);
    const [apiError, setApiError] = useState(null);

    const isPlaying = gameStatus === GameStatus.Playing;

    const updateWordTemplateWithCorrectLetter = useCallback((letter, originalWord, normalizedWord) => {
        setWordTemplate(prev => {
            const newTemplate = [...prev];
            
            for (let i = 0; i < normalizedWord.length; i++) {
                if (normalizedWord[i] === letter) {
                    newTemplate[i] = originalWord[i];
                }
            }
            return newTemplate;
        });
    }, []);

    const initializeWordTemplate = useCallback((originalWord, normalizedWord, correctLetters) => {
        const template = [];
        
        for (let i = 0; i < originalWord.length; i++) {
            const originalChar = originalWord[i];
            const normalizedChar = normalizedWord[i];
            
            if (originalChar === ' ') {
                template[i] = ' ';
            } else if (correctLetters.has(normalizedChar)) {
                template[i] = originalChar;
            } else {
                template[i] = '_';
            }
        }
        return template;
    }, []);

    const getHangmanWordFromServer = useCallback(async () => {
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout();
            return null;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Hangman/dailyword`, {
                headers: { Authorization: `Bearer ${token.replace(/"/g, '')}` },
            });

            if (!response.ok) {
                if (response.status === 401) onLogout();
                throw new Error('Error al obtener la palabra del día.');
            }
            return await response.json();
        } catch (error) {
            setApiError('Error al obtener la palabra del día. Por favor, inténtalo de nuevo más tarde.');
            return null;
        }
    }, [onLogout]);

    const saveResultToServer = useCallback(async (isSolved) => {
        const token = localStorage.getItem('authToken');
        if (!token || !gameWordId) {
            onLogout();
            return;
        }
        
        const timeTakenSeconds = Math.floor((new Date() - startTime) / 1000);
        
        const payload = {
            gameWordId,
            guessedLetters: [...guessedLetters, ...incorrectlyGuessedLetters].join(''),
            incorrectGuesses: incorrectlyGuessedLetters.size,
            isSolved,
            timeTakenSeconds
        };

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Hangman/saveresult`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                if (response.status === 401) onLogout();
                const errorData = await response.json();
                setApiError(`Error al guardar el resultado: ${errorData.message || 'Inténtalo de nuevo.'}`);
            }
        } catch (error) {
            console.error('Error en la llamada a la API de guardar resultado:', error);
        }
    }, [gameWordId, guessedLetters, incorrectlyGuessedLetters, onLogout, startTime]);

    const awardPoints = useCallback(async (incorrectCount) => {
        const basePoints = 500;
        const pointsPerIncorrectGuess = 50;
        let pointsToAward = Math.max(0, basePoints - (incorrectCount * pointsPerIncorrectGuess));

        if (pointsToAward === 0) return; // No sumar puntos si el resultado es 0 o negativo

        try {
            const token = localStorage.getItem('authToken');
            if (!token) return;
            
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Game/addpoints/${pointsToAward}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token.replace(/"/g, '')}` },
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`Puntos sumados con éxito (${pointsToAward}). Total:`, data.totalPoints);
            } else {
                console.error('Error al sumar puntos:', response.status);
            }
        } catch (ex) {
            console.error('Error al sumar puntos:', ex);
        }
    }, []);

    const startNewGame = useCallback(async () => {
        setIsLoading(true);
        setApiError(null);
        
        const daily = await getHangmanWordFromServer();
        
        if (!daily) {
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        if (!daily.word && !daily.wordLength) {
            setApiError('Error: No se pudo obtener la palabra del servidor');
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        let wordToUse = daily.word || '';
        const normalizedWord = normalizeString(wordToUse);
        
        if (!wordToUse && daily.wordLength) {
            wordToUse = '_'.repeat(daily.wordLength);
            setApiError('Advertencia: Jugando sin conocer la palabra real del servidor');
        }

        if (!normalizedWord) {
            setApiError('Error al procesar la palabra del servidor');
            setGameStatus(GameStatus.Lost);
            setIsLoading(false);
            return;
        }

        const allGuessedLetters = daily.guessedLetters ? daily.guessedLetters.split('') : [];
        const correctLetters = new Set();
        const incorrectLetters = new Set();
        
        allGuessedLetters.forEach(letter => {
            if (normalizedWord.includes(letter)) {
                correctLetters.add(letter);
            } else {
                incorrectLetters.add(letter);
            }
        });

        const initialTemplate = initializeWordTemplate(wordToUse, normalizedWord, correctLetters);

        let newKeyStatuses = {};
        LETTER_SET.split('').forEach(char => {
            if (correctLetters.has(char)) {
                newKeyStatuses[char] = LetterStatus.Correct;
            } else if (incorrectLetters.has(char)) {
                newKeyStatuses[char] = LetterStatus.Absent;
            } else {
                newKeyStatuses[char] = LetterStatus.Default;
            }
        });
        
        if (daily.isSolved) {
            setGameStatus(GameStatus.Won);
        } else if (incorrectLetters.size >= MAX_INCORRECT_GUESSES) {
            setGameStatus(GameStatus.Lost);
        } else {
            setGameStatus(GameStatus.Playing);
        }

        setOriginalWord(wordToUse);
        setTargetWord(normalizedWord);
        setWordTemplate(initialTemplate);
        setGameWordId(daily.gameWordId);
        setGuessedLetters(correctLetters);
        setIncorrectlyGuessedLetters(incorrectLetters);
        setKeyStatuses(newKeyStatuses);
        setStartTime(new Date());

        setIsLoading(false);
    }, [getHangmanWordFromServer, initializeWordTemplate]);

    useEffect(() => {
        startNewGame();
    }, [startNewGame]);

    const submitGuess = useCallback(async (letter) => {
        if (!isPlaying || guessedLetters.has(letter) || incorrectlyGuessedLetters.has(letter)) {
            return;
        }
        
        const token = localStorage.getItem('authToken');
        if (!token) {
            onLogout();
            return;
        }
        
        try {
            const allGuessedLetters = new Set([...guessedLetters, ...incorrectlyGuessedLetters]);
            allGuessedLetters.add(letter);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/Hangman/guess`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameWordId: gameWordId,
                    guessLetter: letter,
                    guessedLetters: [...allGuessedLetters].join(''),
                    incorrectGuesses: incorrectlyGuessedLetters.size // Se envía el tamaño actual antes de la posible actualización
                }),
            });

            if (!response.ok) {
                if (response.status === 401) onLogout();
                const errorData = await response.json();
                setApiError(`Error del servidor: ${errorData.message || 'Inténtalo de nuevo.'}`);
                throw new Error('Error al enviar la letra.');
            }
            
            setApiError(null);
            const result = await response.json();
            
            if (result.isCorrect) {
                const newGuessed = new Set(guessedLetters).add(letter);
                setGuessedLetters(newGuessed);
                setKeyStatuses(prev => ({ ...prev, [letter]: LetterStatus.Correct }));
                updateWordTemplateWithCorrectLetter(letter, originalWord, targetWord);

                // 🔁 Guardar progreso parcial en la API
                await fetch(`${import.meta.env.VITE_API_URL}/api/Hangman/updateprogress`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameWordId,
                        guessedLetters: [...newGuessed, ...incorrectlyGuessedLetters].join(''),
                        incorrectGuesses: incorrectlyGuessedLetters.size,
                        isSolved: false,
                        timeTakenSeconds: Math.floor((new Date() - startTime) / 1000)
                    }),
                });
                
            } else {
                const newIncorrect = new Set(incorrectlyGuessedLetters).add(letter);
                setIncorrectlyGuessedLetters(newIncorrect);
                setKeyStatuses(prev => ({ ...prev, [letter]: LetterStatus.Absent }));

                // 🔁 Guardar progreso parcial en la API
                await fetch(`${import.meta.env.VITE_API_URL}/api/Hangman/updateprogress`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token.replace(/"/g, '')}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        gameWordId,
                        guessedLetters: [...guessedLetters, ...newIncorrect].join(''),
                        incorrectGuesses: newIncorrect.size, // Se envía el tamaño actualizado
                        isSolved: false,
                        timeTakenSeconds: Math.floor((new Date() - startTime) / 1000)
                    }),
                });
            }

            if (result.hasWon) {
                setGameStatus(GameStatus.Won);
                awardPoints(incorrectlyGuessedLetters.size); // Pasa el número de fallos actuales para el cálculo de puntos
                saveResultToServer(true);
            } else if (result.hasLost) {
                setGameStatus(GameStatus.Lost);
                saveResultToServer(false);
            }
        } catch (error) {
            setApiError('Error de conexión. Por favor, inténtalo de nuevo.');
        }
        
    }, [isPlaying, guessedLetters, incorrectlyGuessedLetters, gameWordId, onLogout, awardPoints, saveResultToServer, originalWord, targetWord, updateWordTemplateWithCorrectLetter, startTime]);
    
    // Efecto para el teclado físico
    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = normalizeString(e.key);
            if (LETTER_SET.includes(key) && isPlaying) {
                submitGuess(key);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isPlaying, submitGuess]);

    const displayedWord = wordTemplate.map((char, index) => {
        if (char === ' ') {
            return <div key={index} className="w-3 h-10 md:w-4 md:h-12"></div>; // Espacio más pequeño para responsividad
        }
        
        const isRevealed = char !== '_';
        
        return (
            <div
                key={index}
                className={`
                    w-8 h-10 md:w-10 md:h-12 // Tamaño más compacto
                    flex items-center justify-center rounded-lg text-xl md:text-2xl font-bold tracking-widest
                    transition-colors duration-300 border-2
                    ${isRevealed 
                        ? 'bg-blue-600 text-white border-blue-400' 
                        : 'bg-gray-800 text-gray-300 border-gray-600'
                    }
                `}
            >
                {char}
            </div>
        );
    });

    const finalWordDisplay = originalWord.split('').map((letter, index) => (
        <div key={index} className="w-8 h-10 md:w-10 md:h-12 flex items-center justify-center rounded-lg bg-blue-600 text-white text-xl md:text-2xl font-bold tracking-widest transition-colors duration-300">
            {letter}
        </div>
    ));

    return (
        <div className="flex flex-col items-center justify-start p-6 bg-gray-950 text-white min-h-screen font-inter">
            <h3 className="text-4xl md:text-5xl font-extrabold text-blue-400 mb-6 text-center">
                Ahorcado
            </h3>

            {/* Descripción del sistema de puntos */}
            <div className="text-center mb-4 p-3 bg-gray-800 rounded-lg text-gray-300 text-sm max-w-md">
                <p className="font-semibold text-base mb-1">Gana puntos adivinando la palabra. ¡Cada fallo resta 50 puntos!</p>
                <ul className="list-disc list-inside text-left mx-auto max-w-max">
                    <li>Empiezas con: <strong className="text-green-400">500 pts</strong></li>
                    <li>Cada fallo resta: <strong className="text-red-400">50 pts</strong></li>
                    <li>Máximo de fallos: <strong className="text-orange-400">{MAX_INCORRECT_GUESSES}</strong></li>
                </ul>
                <p className="mt-2 text-xs text-gray-400">
                    *Si ganas, tus puntos finales serán 500 menos 50 por cada letra incorrecta.
                </p>
            </div>

            {isLoading ? (
                <div className="text-xl text-blue-400 animate-pulse mt-10">
                    <lucide.Loader2 className="animate-spin inline-block mr-2" size={24} />
                    Cargando juego...
                </div>
            ) : (
                <>
                    <div className="hangman-container mb-10">
                        <HangmanDrawing incorrectGuesses={incorrectlyGuessedLetters.size} />
                    </div>
                    
                    {/* Word Board con desplazamiento horizontal */}
                    <div className="word-board flex gap-2 mb-10 justify-center flex-nowrap overflow-x-auto pb-2 px-2 max-w-full">
                        {originalWord && originalWord.length > 0 ? (
                            isPlaying ? displayedWord : finalWordDisplay
                        ) : (
                            <div className="text-red-400 text-xl whitespace-normal">
                                ⚠️ Error: No se pudo cargar la palabra
                            </div>
                        )}
                    </div>

                    <Keyboard
                        keyStatuses={keyStatuses}
                        onKeyClick={submitGuess}
                        isPlaying={isPlaying}
                    />

                    <div className="mt-4 text-center w-full max-w-lg">
                        {apiError && (
                            <div className="p-4 rounded-lg bg-red-600 text-white shadow-xl mb-4">
                                <p className="text-lg">{apiError}</p>
                            </div>
                        )}

                        {!isPlaying && (
                            <div className={`p-4 rounded-lg shadow-xl text-white transition-all duration-500 ${gameStatus === GameStatus.Won ? 'bg-green-600' : 'bg-red-600'}`}>
                                <h4 className="text-2xl md:text-3xl font-bold mb-2">
                                    {gameStatus === GameStatus.Won 
                                        ? '¡Felicidades, ganaste!' 
                                        : '¡Lo siento, perdiste!'}
                                </h4>
                                <p className="text-lg md:text-xl">
                                    La palabra era: <strong className="text-yellow-300">
                                        {originalWord.toUpperCase()}
                                    </strong>
                                </p>
                            </div>
                        )}
                        
                        {isPlaying && incorrectlyGuessedLetters.size > 0 && (
                            <p className="text-xl mt-4 text-red-400">
                                Fallos: {incorrectlyGuessedLetters.size}/{MAX_INCORRECT_GUESSES}
                            </p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
