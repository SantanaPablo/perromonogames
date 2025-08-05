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
public class GameController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _env;

    private const int WordLength = 5;
    private const string GameName = "Adivinar la Palabra";

    public GameController(ApplicationDbContext context, IWebHostEnvironment env)
    {
        _context = context;
        _env = env;
    }
    [AllowAnonymous]
    [HttpGet("loadDictionary")]
    public async Task<IActionResult> LoadDictionaryWords()
    {
        var filePath = Path.Combine(_env.ContentRootPath, "Resources", "0_palabras_todas_no_conjugaciones.txt");
        if (!System.IO.File.Exists(filePath))
        {
            return NotFound("Archivo del diccionario no encontrado. Asegúrate de que el archivo esté en la carpeta Resources.");
        }

        // Paso 1: Leer palabras, normalizar (sin tildes) y convertir a mayúsculas
        var wordsFromFile = System.IO.File.ReadLines(filePath)
            .Select(line => line.Trim())
            .Where(word => !string.IsNullOrEmpty(word) && word.All(char.IsLetter))
            .Select(word => new
            {
                Original = word.ToUpperInvariant(),
                Normalized = RemoveDiacritics(word).ToUpperInvariant()
            })
            .GroupBy(w => w.Normalized)
            .Select(g => g.First()) // Solo la primera variante de cada palabra
            .ToList();

        // Paso 2: Obtener palabras existentes en DB (también normalizadas sin tildes)
        var existingWords = await _context.DictionaryWords
            .Select(dw => RemoveDiacritics(dw.Word).ToUpperInvariant())
            .ToListAsync();

        var existingWordsSet = new HashSet<string>(existingWords);

        // Paso 3: Filtrar palabras nuevas
        var wordsToLoad = wordsFromFile
            .Where(w => !existingWordsSet.Contains(w.Normalized))
            .Select(w => new DictionaryWord
            {
                Word = w.Original,
                WordLength = w.Original.Length
            })
            .ToList();

        if (wordsToLoad.Any())
        {
            _context.DictionaryWords.AddRange(wordsToLoad);
            await _context.SaveChangesAsync();
        }

        return Ok($"Se han cargado {wordsToLoad.Count} palabras nuevas. Total acumulado: {existingWordsSet.Count + wordsToLoad.Count}.");
    }


    [HttpGet("dailyword")]
    public async Task<ActionResult<DailyWordInfoDto>> GetDailyWord()
    {
        var today = DateTime.UtcNow.Date;
        var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);

        if (game == null)
        {
            return BadRequest("El juego 'Adivinar la Palabra' no está registrado.");
        }

        var gameWord = await _context.GameWords
            .Where(gw => gw.GameId == game.Id && gw.CreatedAt.Date == today)
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
                CreatedAt = today
            };

            _context.GameWords.Add(gameWord);
            await _context.SaveChangesAsync();
        }

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no disponible en los claims.");
        }

        var alreadySolved = await _context.WordGuessGameResults
            .AnyAsync(r => r.UserId == userId && r.GameWordId == gameWord.Id && r.IsSolved);

        return new DailyWordInfoDto
        {
            GameWordId = gameWord.Id,
            WordLength = gameWord.WordLength,
            Word = alreadySolved ? gameWord.Word.ToUpper() : null,
            IsSolved = alreadySolved
        };
    }

    [HttpPost("guess")]
    public async Task<ActionResult<WordGuessResultDto>> SubmitGuess([FromBody] WordGuessValidationRequestDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no disponible en los claims.");
        }

        var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == request.GameWordId);
        if (gameWord == null)
        {
            return NotFound("Palabra no encontrada.");
        }

        var prevResults = await _context.WordGuessGameResults
            .Where(r => r.UserId == userId && r.GameWordId == gameWord.Id)
            .ToListAsync();

        var alreadySolved = prevResults.Any(r => r.IsSolved);
        var totalAttempts = prevResults.Count;

        if (alreadySolved)
        {
            return BadRequest("Ya has resuelto esta palabra.");
        }

        if (totalAttempts >= 6)
        {
            return BadRequest("Has alcanzado el límite de 6 intentos sin resolver la palabra.");
        }

        if (request.Guess.Length != WordLength)
        {
            return BadRequest($"La palabra debe tener {WordLength} letras.");
        }

        var isCorrect = string.Equals(request.Guess.Trim(), gameWord.Word.Trim(), StringComparison.OrdinalIgnoreCase);
        var letterStatuses = GetGuessLetterStatuses(request.Guess.ToUpper(), gameWord.Word.ToUpper());

        var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);

        var newResult = new WordGuessGameResult
        {
            GameId = game?.Id ?? 0,
            UserId = userId,
            GameWordId = request.GameWordId,
            Attempts = totalAttempts + 1,
            TimeTakenSeconds = null,
            IsSolved = isCorrect,
            PlayedAt = DateTime.UtcNow
        };

        _context.WordGuessGameResults.Add(newResult);
        await _context.SaveChangesAsync();

        return new WordGuessResultDto
        {
            GameWordId = request.GameWordId,
            Attempts = newResult.Attempts,
            IsSolved = isCorrect,
            LetterStatuses = letterStatuses
        };
    }

    [Authorize]
    [HttpPost("addpoints/{points}")]
    public async Task<IActionResult> AddPoints(int points)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("El ID del usuario no es válido.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound("Usuario no encontrado");

        user.Points += points;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{points} puntos añadidos.", totalPoints = user.Points });
    }

    private List<LetterStatusDTO> GetGuessLetterStatuses(string guess, string targetWord)
    {
        var statusList = new List<LetterStatusDTO>(Enumerable.Repeat(LetterStatusDTO.Absent, targetWord.Length));
        var targetChars = targetWord.ToCharArray();
        var guessChars = guess.ToCharArray();
        var targetUsed = new bool[targetWord.Length];

        // Paso 1: letras correctas
        for (int i = 0; i < targetWord.Length; i++)
        {
            if (guessChars[i] == targetChars[i])
            {
                statusList[i] = LetterStatusDTO.Correct;
                targetUsed[i] = true;
            }
        }

        // Paso 2: letras presentes
        for (int i = 0; i < targetWord.Length; i++)
        {
            if (statusList[i] == LetterStatusDTO.Correct) continue;

            for (int j = 0; j < targetWord.Length; j++)
            {
                if (!targetUsed[j] && guessChars[i] == targetChars[j])
                {
                    statusList[i] = LetterStatusDTO.Present;
                    targetUsed[j] = true;
                    break;
                }
            }
        }

        return statusList;
    }
    private async Task<string?> GetRandomWordFromDictionary()
    {
        var words = await _context.DictionaryWords
            .Where(dw => dw.WordLength == WordLength) // Filtra las palabras de 5 letras
            .ToListAsync();

        if (!words.Any())
        {
            return null;
        }

        var random = new Random();
        var selectedWord = words[random.Next(words.Count)];

        return selectedWord.Word;
    }

    public static string RemoveDiacritics(string text)
    {
        return new string(text
            .Normalize(NormalizationForm.FormD)
            .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
            .ToArray())
            .Normalize(NormalizationForm.FormC);
    }

}