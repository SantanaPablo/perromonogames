using Microsoft.AspNetCore.Authorization;

using Microsoft.AspNetCore.Mvc;

using Microsoft.EntityFrameworkCore;

using MiJuegosWeb.Domain.DTOs; // Asegúrate de que estos DTOs estén definidos aquí

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
            return BadRequest("El juego 'Adivinar la Palabra' no está registrado.");

        var gameWord = await _context.GameWords
            .Where(gw => gw.GameId == game.Id && gw.CreatedAt.Date == today)
            .FirstOrDefaultAsync();

        if (gameWord == null)
        {
            var randomWord = await GetRandomWordFromDictionary();
            if (string.IsNullOrEmpty(randomWord))
                return NotFound("No se pudo obtener una palabra del diccionario.");

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
        int.TryParse(userIdStr, out int userId); // Puede ser null

        var userGameResult = userId != 0
            ? await _context.WordGuessGameResults
                .Where(r => r.UserId == userId && r.GameWordId == gameWord.Id)
                .FirstOrDefaultAsync()
            : null;

        var alreadySolved = userGameResult?.IsSolved ?? false;
        var attemptsUsed = userGameResult?.Attempts ?? 0;

        return new DailyWordInfoDto
        {
            GameWordId = gameWord.Id,
            WordLength = gameWord.WordLength,
            Word = gameWord.Word.ToUpper(), // 👈 SIEMPRE DEVUELVE LA PALABRA
            IsSolved = alreadySolved,
            AttemptsUsed = attemptsUsed
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



        // Intentar encontrar un resultado existente para este usuario y palabra del día

        var userGameResult = await _context.WordGuessGameResults

      .Where(r => r.UserId == userId && r.GameWordId == gameWord.Id)

      .FirstOrDefaultAsync();



        if (userGameResult == null)

        {

            // Es el primer intento del usuario para esta palabra del día

            var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);

            userGameResult = new WordGuessGameResult

            {

                GameId = game?.Id ?? 0,

                UserId = userId,

                GameWordId = request.GameWordId,

                Attempts = 1, // Primer intento

                TimeTakenSeconds = null, // Se puede actualizar al finalizar el juego

                IsSolved = false, // Por defecto no resuelto

                PlayedAt = DateTime.UtcNow

            };

            _context.WordGuessGameResults.Add(userGameResult);

        }

        else

        {

            // El usuario ya ha hecho intentos para esta palabra

            if (userGameResult.IsSolved)

            {

                return BadRequest("Ya has resuelto esta palabra.");

            }

            if (userGameResult.Attempts >= 6) // El límite de intentos

            {

                return BadRequest("Has alcanzado el límite de 6 intentos sin resolver la palabra.");

            }



            userGameResult.Attempts += 1; // Incrementar el número de intentos

            userGameResult.PlayedAt = DateTime.UtcNow; // Actualizar la fecha del último intento

            // No es necesario llamar a _context.Update(userGameResult) explícitamente,

            // EF Core rastrea los cambios de las entidades que ya están en el contexto.

        }



        // Validar la longitud de la palabra

        if (request.Guess.Length != WordLength)

        {

            return BadRequest($"La palabra debe tener {WordLength} letras.");

        }



        var isCorrect = string.Equals(request.Guess.Trim(), gameWord.Word.Trim(), StringComparison.OrdinalIgnoreCase);

        var letterStatuses = GetGuessLetterStatuses(request.Guess.ToUpper(), gameWord.Word.ToUpper());



        // Actualizar el estado de IsSolved en el registro

        userGameResult.IsSolved = isCorrect;



        await _context.SaveChangesAsync(); // Guardar los cambios (ya sea Add o Update)



        return new WordGuessResultDto

        {

            GameWordId = request.GameWordId,

            Attempts = userGameResult.Attempts, // Devolver el número de intentos actualizado

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

