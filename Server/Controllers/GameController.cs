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
            return NotFound("Archivo del diccionario no encontrado.");

        var wordsFromFile = System.IO.File.ReadLines(filePath)
            .Select(line => line.Trim())
            .Where(word => !string.IsNullOrEmpty(word) && word.All(char.IsLetter))
            .Select(word => new
            {
                Original = word.ToUpperInvariant(),
                Normalized = RemoveDiacritics(word).ToUpperInvariant()
            })
            .GroupBy(w => w.Normalized)
            .Select(g => g.First())
            .ToList();

        var existingWords = await _context.DictionaryWords
            .Select(dw => RemoveDiacritics(dw.Word).ToUpperInvariant())
            .ToListAsync();

        var existingWordsSet = new HashSet<string>(existingWords);

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
            return BadRequest("El juego no está registrado.");

        var gameWord = await _context.GameWords
            .Where(gw => gw.GameId == game.Id && gw.CreatedAt.Date == today)
            .FirstOrDefaultAsync();

        if (gameWord == null)
        {
            var randomWord = await GetRandomWordFromDictionary();
            if (string.IsNullOrEmpty(randomWord))
                return NotFound("No se pudo obtener una palabra.");

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
        int.TryParse(userIdStr, out int userId);

        var userGameResult = userId != 0
            ? await _context.WordGuessGameResults
                .Where(r => r.UserId == userId && r.GameWordId == gameWord.Id)
                .FirstOrDefaultAsync()
            : null;

        return new DailyWordInfoDto
        {
            GameWordId = gameWord.Id,
            WordLength = gameWord.WordLength,
            Word = gameWord.Word.ToUpper(),
            IsSolved = userGameResult?.IsSolved ?? false,
            AttemptsUsed = userGameResult?.Attempts ?? 0
        };
    }

    [HttpPost("guess")]
    public async Task<ActionResult<WordGuessResultDto>> SubmitGuess([FromBody] WordGuessValidationRequestDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no disponible.");

        var gameWord = await _context.GameWords.FirstOrDefaultAsync(w => w.Id == request.GameWordId);
        if (gameWord == null)
            return NotFound("Palabra no encontrada.");

        var userGameResult = await _context.WordGuessGameResults
            .Where(r => r.UserId == userId && r.GameWordId == gameWord.Id)
            .FirstOrDefaultAsync();

        if (userGameResult == null)
        {
            var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);
            userGameResult = new WordGuessGameResult
            {
                GameId = game?.Id ?? 0,
                UserId = userId,
                GameWordId = request.GameWordId,
                Attempts = 1,
                IsSolved = false,
                PlayedAt = DateTime.UtcNow
            };
            _context.WordGuessGameResults.Add(userGameResult);
        }
        else
        {
            if (userGameResult.IsSolved)
                return BadRequest("Ya has resuelto esta palabra.");

            if (userGameResult.Attempts >= 6)
                return BadRequest("Has alcanzado el límite de intentos.");

            userGameResult.Attempts += 1;
            userGameResult.PlayedAt = DateTime.UtcNow;
        }

        if (request.Guess.Length != WordLength)
            return BadRequest($"La palabra debe tener {WordLength} letras.");

        var isCorrect = string.Equals(request.Guess.Trim(), gameWord.Word.Trim(), StringComparison.OrdinalIgnoreCase);
        var letterStatuses = GetGuessLetterStatuses(request.Guess.ToUpper(), gameWord.Word.ToUpper());

        // 🔹 Usar el valor que llega desde el frontend si está presente
        if (request.IsSolved.HasValue)
        {
            userGameResult.IsSolved = request.IsSolved.Value == 1;
        }
        else
        {
            userGameResult.IsSolved = isCorrect;
        }

        await _context.SaveChangesAsync();

        return new WordGuessResultDto
        {
            GameWordId = request.GameWordId,
            Attempts = userGameResult.Attempts,
            IsSolved = userGameResult.IsSolved,
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

        for (int i = 0; i < targetWord.Length; i++)
        {
            if (guessChars[i] == targetChars[i])
            {
                statusList[i] = LetterStatusDTO.Correct;
                targetUsed[i] = true;
            }
        }
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
            .Where(dw => dw.WordLength == WordLength)
            .ToListAsync();

        if (!words.Any())
            return null;

        var random = new Random();
        var selectedWord = words[random.Next(words.Count)];
        return selectedWord.Word;
    }

    [AllowAnonymous]
    [HttpGet("dictionary")]
    public async Task<ActionResult<List<string>>> GetDictionary()
    {
        var words = await _context.DictionaryWords
            .Where(w => w.WordLength == WordLength)
            .Select(w => w.Word.ToUpper())
            .ToListAsync();

        return Ok(words);
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
