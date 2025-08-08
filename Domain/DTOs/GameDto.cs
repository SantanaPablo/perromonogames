using System.ComponentModel.DataAnnotations;

namespace MiJuegosWeb.Domain.DTOs
{
    public class DailyWordInfoDto
    {
        public int GameWordId { get; set; }
        public int WordLength { get; set; }
        public string? Word { get; set; }
        public bool IsSolved { get; set; }
        public int AttemptsUsed { get; set; } // Propiedad añadida para corregir el error
    }

    public class WordGuessValidationRequestDto
    {
        public int GameWordId { get; set; }
        public string Guess { get; set; } = string.Empty;
        public int? IsSolved { get; set; }

    }

    public class WordGuessResultDto
    {
        public int GameWordId { get; set; }
        public int Attempts { get; set; }
        public bool IsSolved { get; set; }
        public List<LetterStatusDTO> LetterStatuses { get; set; } = new List<LetterStatusDTO>();
    }

    // DTOs (Asegúrate de que estos estén en tu carpeta MiJuegosWeb.Domain.DTOs)
    // ---
    public class DailyPinInfoDto
    {
        public int GamePinId { get; set; }
        public string? Pin { get; set; } // Será null si no está resuelto
        public bool IsSolved { get; set; }
        public int AttemptsUsed { get; set; } // ¡NUEVO! Para el frontend
    }

    public class PinGuessRequestDto
    {
        public int GamePinId { get; set; }
        public string Guess { get; set; } = string.Empty;
    }

    public class PinGuessResultDto
    {
        public int Attempts { get; set; }
        public bool IsSolved { get; set; }
        public List<int> DigitStatuses { get; set; } = new(); // 1: Correcto, 2: Presente, 3: Ausente
    }
    // --- Fin DTOs

    public enum LetterStatusDTO { Default, Correct, Present, Absent }

    public class PointsUpdateDto
    {
        public int Points { get; set; }
    }

    public class HangmanDailyWordInfoDto
    {
        public int GameWordId { get; set; }
        public string Word { get; set; }
        public int WordLength { get; set; }
        public bool IsSolved { get; set; }
        public int IncorrectGuesses { get; set; }
        public string GuessedLetters { get; set; }
    }

    public class HangmanGuessRequestDto
    {
        public int GameWordId { get; set; }
        public string GuessLetter { get; set; }
        public string GuessedLetters { get; set; }
        public int IncorrectGuesses { get; set; }
    }

    public class HangmanGuessResultDto
    {
        public bool IsCorrect { get; set; }
        public bool HasWon { get; set; }
        public bool HasLost { get; set; }
    }

    public class HangmanSaveResultDto
    {
        public int GameWordId { get; set; }
        public string GuessedLetters { get; set; }
        public int IncorrectGuesses { get; set; }
        public bool IsSolved { get; set; }
        public int TimeTakenSeconds { get; set; }
    }

    public class HangmanGameResult
    {
        [Key]
        public int Id { get; set; }

        public int UserId { get; set; }

        public int GameWordId { get; set; }

        public int IncorrectGuesses { get; set; }

        public bool IsSolved { get; set; }

        public DateTime PlayedAt { get; set; }

        [MaxLength(26)]
        public string GuessedLetters { get; set; } = string.Empty;
    }

    public class HangmanCurrentStateDto
    {
        public string RevealedWord { get; set; } = string.Empty;
        public bool IsComplete { get; set; }
    }
}