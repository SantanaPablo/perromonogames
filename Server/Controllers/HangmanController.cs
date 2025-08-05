using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data;
using System.Globalization;
using System.Security.Claims;
using System.Text;

namespace MiJuegosWeb.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class HangmanController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private const string GameName = "Ahorcado";
    private const int MinWordLength = 7;
    private const int MaxIncorrectGuesses = 6;

    public HangmanController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Obtiene la información de la palabra diaria para el juego del ahorcado.
    /// También verifica si el usuario ya ha jugado hoy y devuelve el estado guardado.
    /// </summary>
    [HttpGet("dailyword")]
    public async Task<ActionResult<HangmanDailyWordInfoDto>> GetDailyWord()
    {
        var today = DateTime.UtcNow.Date;
        var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);

        if (game == null)
        {
            return BadRequest($"El juego '{GameName}' no está registrado.");
        }

        // Busca la palabra del día.
        var gameWord = await _context.GameWords
            .Where(gw => gw.GameId == game.Id && gw.CreatedAt.Date == today && gw.WordLength >= MinWordLength)
            .FirstOrDefaultAsync();

        if (gameWord == null)
        {
            var randomWord = await GetRandomWordFromDictionary();
            if (string.IsNullOrEmpty(randomWord))
            {
                return NotFound("No se pudo obtener una palabra del diccionario.");
            }

            gameWord = new GameWord
            {
                GameId = game.Id,
                Word = randomWord.ToUpper(),
                WordLength = randomWord.Length,
                IsCommon = true,
                CreatedAt = today
            };

            _context.GameWords.Add(gameWord);
            await _context.SaveChangesAsync();
        }

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no válido.");
        }

        // Busca si el usuario ya ha jugado esta palabra hoy.
        var userGameResult = await _context.HangmanGuessGameResults
            .FirstOrDefaultAsync(r => r.UserId == userId && r.GameWordId == gameWord.Id);

        if (userGameResult != null)
        {
            // CORREGIDO: Siempre devolver la palabra real para que el frontend pueda colocar las letras correctamente
            return new HangmanDailyWordInfoDto
            {
                GameWordId = gameWord.Id,
                Word = gameWord.Word.ToUpper(), // CAMBIO: Siempre devolver la palabra real
                WordLength = gameWord.WordLength,
                IsSolved = userGameResult.IsSolved,
                IncorrectGuesses = userGameResult.IncorrectGuesses,
                GuessedLetters = userGameResult.GuessedLetters
            };
        }
        else
        {
            // CORREGIDO: También devolver la palabra real para juegos nuevos
            return new HangmanDailyWordInfoDto
            {
                GameWordId = gameWord.Id,
                Word = gameWord.Word.ToUpper(), // CAMBIO: Devolver la palabra real
                WordLength = gameWord.WordLength,
                IsSolved = false,
                IncorrectGuesses = 0,
                GuessedLetters = string.Empty
            };
        }
    }

    /// <summary>
    /// Valida un intento de letra.
    /// </summary>
    [HttpPost("guess")]
    public async Task<ActionResult<HangmanGuessResultDto>> SubmitGuess([FromBody] HangmanGuessRequestDto request)
    {
        var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == request.GameWordId);
        if (gameWord == null)
        {
            return NotFound("Palabra no encontrada.");
        }

        var guessLetter = request.GuessLetter.ToUpper().FirstOrDefault();
        if (guessLetter == '\0' || !char.IsLetter(guessLetter))
        {
            return BadRequest("El intento debe ser una sola letra válida.");
        }

        // CORREGIDO: Normalizar tanto la palabra como la letra para comparación correcta
        var normalizedWord = RemoveAccents(gameWord.Word);
        var normalizedGuess = RemoveAccents(guessLetter.ToString());
        var isCorrectGuess = normalizedWord.Contains(normalizedGuess);

        // CORREGIDO: Mejorar la lógica de verificación de victoria
        var normalizedGuessedLetters = RemoveAccents(request.GuessedLetters);
        var hasWon = normalizedWord.All(c => char.IsLetter(c) ? normalizedGuessedLetters.Contains(c) : true);

        // CORREGIDO: Calcular incorrectGuesses basado en si la letra actual es incorrecta
        var currentIncorrectGuesses = request.IncorrectGuesses;
        if (!isCorrectGuess)
        {
            currentIncorrectGuesses++;
        }

        var hasLost = currentIncorrectGuesses >= MaxIncorrectGuesses;

        Console.WriteLine($"[DEBUG] Letra '{guessLetter}' en palabra '{gameWord.Word}'");
        Console.WriteLine($"[DEBUG] Normalizada: '{normalizedGuess}' en '{normalizedWord}'");
        Console.WriteLine($"[DEBUG] Es correcta: {isCorrectGuess}");
        Console.WriteLine($"[DEBUG] Letras adivinadas: '{request.GuessedLetters}'");
        Console.WriteLine($"[DEBUG] Ha ganado: {hasWon}, Ha perdido: {hasLost}");

        return new HangmanGuessResultDto
        {
            IsCorrect = isCorrectGuess,
            HasWon = hasWon,
            HasLost = hasLost
        };
    }

    /// <summary>
    /// Guarda el resultado final del juego en la base de datos.
    /// </summary>
    [HttpPost("saveresult")]
    public async Task<IActionResult> SaveResult([FromBody] HangmanSaveResultDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no válido.");
        }

        Console.WriteLine($"[DEBUG] Intentando guardar resultado del juego para UserId: {userId}");
        Console.WriteLine($"[DEBUG] Datos recibidos: ");
        Console.WriteLine($"[DEBUG] GameWordId: {request.GameWordId}");
        Console.WriteLine($"[DEBUG] GuessedLetters: '{request.GuessedLetters}'");
        Console.WriteLine($"[DEBUG] IncorrectGuesses: {request.IncorrectGuesses}");
        Console.WriteLine($"[DEBUG] IsSolved: {request.IsSolved}");
        Console.WriteLine($"[DEBUG] TimeTakenSeconds: {request.TimeTakenSeconds}");

        try
        {
            var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == request.GameWordId);
            if (gameWord == null)
            {
                return NotFound(new { message = "Palabra no encontrada." });
            }

            // Buscar resultado existente para actualizar en lugar de crear duplicado
            var existingResult = await _context.HangmanGuessGameResults
                .FirstOrDefaultAsync(r => r.UserId == userId && r.GameWordId == request.GameWordId);

            if (existingResult != null)
            {
                // CORREGIDO: Actualizar resultado existente en lugar de rechazar
                existingResult.IncorrectGuesses = request.IncorrectGuesses;
                existingResult.IsSolved = request.IsSolved;
                existingResult.GuessedLetters = request.GuessedLetters;
                existingResult.PlayedAt = DateTime.UtcNow;

                Console.WriteLine("[DEBUG] Actualizando resultado existente.");
            }
            else
            {
                // Crear nuevo resultado
                var result = new HangmanGameResult
                {
                    UserId = userId,
                    GameWordId = request.GameWordId,
                    IncorrectGuesses = request.IncorrectGuesses,
                    IsSolved = request.IsSolved,
                    PlayedAt = DateTime.UtcNow,
                    GuessedLetters = request.GuessedLetters
                };

                _context.HangmanGuessGameResults.Add(result);
                Console.WriteLine("[DEBUG] Creando nuevo resultado.");
            }

            await _context.SaveChangesAsync();
            Console.WriteLine("[DEBUG] Resultado del juego guardado exitosamente.");

            return Ok(new { message = "Resultado del juego guardado exitosamente." });
        }
        catch (DbUpdateException ex)
        {
            Console.WriteLine($"[ERROR] Error al guardar en la base de datos: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[ERROR] Inner exception: {ex.InnerException.Message}");
            }
            return StatusCode(500, new { message = "Ocurrió un error al guardar el resultado del juego en la base de datos." });
        }
    }

    // NUEVO: Endpoint para obtener solo las posiciones reveladas (alternativo)
    [HttpGet("revealedpositions/{gameWordId}")]
    public async Task<ActionResult<object>> GetRevealedPositions(int gameWordId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no válido.");
        }

        var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == gameWordId);
        if (gameWord == null)
        {
            return NotFound("Palabra no encontrada.");
        }

        var userGameResult = await _context.HangmanGuessGameResults
            .FirstOrDefaultAsync(r => r.UserId == userId && r.GameWordId == gameWordId);

        var revealedPositions = new List<object>();

        if (userGameResult != null && !string.IsNullOrEmpty(userGameResult.GuessedLetters))
        {
            var normalizedWord = RemoveAccents(gameWord.Word);
            var guessedLetters = RemoveAccents(userGameResult.GuessedLetters);

            for (int i = 0; i < gameWord.Word.Length; i++)
            {
                var normalizedChar = normalizedWord[i];
                if (guessedLetters.Contains(normalizedChar))
                {
                    revealedPositions.Add(new
                    {
                        Position = i,
                        Letter = gameWord.Word[i] // Letra original con tildes
                    });
                }
            }
        }

        return Ok(new
        {
            WordLength = gameWord.WordLength,
            RevealedPositions = revealedPositions
        });
    }

    // Método auxiliar para obtener la palabra diaria
    private async Task<string?> GetRandomWordFromDictionary()
    {
        var words = await _context.DictionaryWords
            .Where(dw => dw.WordLength >= MinWordLength)
            .ToListAsync();

        if (!words.Any())
        {
            return null;
        }

        var random = new Random();
        var selectedWord = words[random.Next(words.Count)];

        return selectedWord.Word;
    }

    // Método auxiliar para quitar tildes
    private string RemoveAccents(string text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }

        text = text.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (char c in text)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        return sb.ToString().Normalize(NormalizationForm.FormC);
    }

    [HttpGet("currentstate/{gameWordId}")]
    public async Task<ActionResult<HangmanCurrentStateDto>> GetCurrentState(int gameWordId)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no válido.");
        }

        var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == gameWordId);
        if (gameWord == null)
        {
            return NotFound("Palabra no encontrada.");
        }

        var userGameResult = await _context.HangmanGuessGameResults
            .FirstOrDefaultAsync(r => r.UserId == userId && r.GameWordId == gameWordId);

        if (userGameResult == null)
        {
            // Juego nuevo, devolver solo guiones
            return new HangmanCurrentStateDto
            {
                RevealedWord = new string('_', gameWord.WordLength),
                IsComplete = false
            };
        }

        // Construir la palabra parcialmente revelada
        var revealedWord = BuildRevealedWord(gameWord.Word, userGameResult.GuessedLetters);
        var normalizedWord = RemoveAccents(gameWord.Word);
        var normalizedGuessedLetters = RemoveAccents(userGameResult.GuessedLetters);
        var isComplete = normalizedWord.All(c => char.IsLetter(c) ? normalizedGuessedLetters.Contains(c) : true);

        return new HangmanCurrentStateDto
        {
            RevealedWord = revealedWord,
            IsComplete = isComplete
        };
    }

    // Método auxiliar para construir la palabra revelada
    private string BuildRevealedWord(string fullWord, string guessedLetters)
    {
        var result = new StringBuilder();
        var normalizedWord = RemoveAccents(fullWord);
        var normalizedGuessedLetters = RemoveAccents(guessedLetters);

        for (int i = 0; i < fullWord.Length; i++)
        {
            var originalChar = fullWord[i];
            var normalizedChar = normalizedWord[i];

            if (normalizedGuessedLetters.Contains(normalizedChar))
            {
                result.Append(originalChar); // Mostrar la letra original (con tildes si las tiene)
            }
            else
            {
                result.Append('_'); // Letra no adivinada
            }
        }

        return result.ToString();
    }
    [HttpPost("updateprogress")]
    public async Task<IActionResult> UpdateProgress([FromBody] HangmanSaveResultDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no válido.");

        var existingResult = await _context.HangmanGuessGameResults
            .FirstOrDefaultAsync(r => r.UserId == userId && r.GameWordId == request.GameWordId);

        if (existingResult == null)
        {
            existingResult = new HangmanGameResult
            {
                UserId = userId,
                GameWordId = request.GameWordId,
                IncorrectGuesses = request.IncorrectGuesses,
                IsSolved = false,
                PlayedAt = DateTime.UtcNow,
                GuessedLetters = request.GuessedLetters
            };
            _context.HangmanGuessGameResults.Add(existingResult);
        }
        else
        {
            // Solo actualiza si no está resuelto aún
            if (!existingResult.IsSolved)
            {
                existingResult.GuessedLetters = request.GuessedLetters;
                existingResult.IncorrectGuesses = request.IncorrectGuesses;
            }
        }

        try
        {
            await _context.SaveChangesAsync();
            return Ok(new { message = "Progreso actualizado." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Error al actualizar el progreso.", detail = ex.Message });
        }
    }
}