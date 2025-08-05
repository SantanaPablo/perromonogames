using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data;
using System.Security.Claims;

namespace MiJuegosWeb.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GamePinController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private const int PinLength = 4;
    private const string GameName = "Adivinar el PIN";

    public GamePinController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("dailypin")]
    public async Task<ActionResult<DailyPinInfoDto>> GetDailyPin()
    {
        var today = DateTime.UtcNow.Date;

        var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);
        if (game == null)
            return BadRequest("El juego 'Adivinar el PIN' no está registrado.");

        var gamePin = await _context.GamePins
            .FirstOrDefaultAsync(gp => gp.GameId == game.Id && gp.CreatedAt.Date == today);

        if (gamePin == null)
        {
            var random = new Random();
            var newPin = random.Next(0, 10000).ToString("D4");

            gamePin = new GamePin
            {
                GameId = game.Id,
                Pin = newPin,
                CreatedAt = today
            };

            _context.GamePins.Add(gamePin);
            await _context.SaveChangesAsync();
        }

        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no disponible.");

        var alreadySolved = await _context.PinGuessGameResults
            .AnyAsync(r => r.UserId == userId && r.GamePinId == gamePin.Id && r.IsSolved);

        return new DailyPinInfoDto
        {
            GamePinId = gamePin.Id,
            Pin = alreadySolved ? gamePin.Pin : null,
            IsSolved = alreadySolved
        };
    }

    [HttpPost("guess")]
    public async Task<ActionResult<PinGuessResultDto>> SubmitGuess([FromBody] PinGuessRequestDto request)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no disponible.");

        var gamePin = await _context.GamePins.FirstOrDefaultAsync(p => p.Id == request.GamePinId);
        if (gamePin == null)
            return NotFound("PIN del juego no encontrado.");

        var prevResults = await _context.PinGuessGameResults
            .Where(r => r.UserId == userId && r.GamePinId == gamePin.Id)
            .ToListAsync();

        var alreadySolved = prevResults.Any(r => r.IsSolved);
        var prevAttempts = prevResults.Count;

        if (alreadySolved)
            return BadRequest("Ya resolviste este PIN.");

        if (prevAttempts >= 6)
            return BadRequest("Has alcanzado el límite de 6 intentos sin resolver el PIN.");

        if (request.Guess.Length != PinLength || !request.Guess.All(char.IsDigit))
            return BadRequest($"El PIN debe tener {PinLength} dígitos numéricos.");

        var isCorrect = request.Guess == gamePin.Pin;
        var digitStatuses = GetDigitStatuses(request.Guess, gamePin.Pin);

        var game = await _context.Games.FirstOrDefaultAsync(g => g.Name == GameName);

        var result = new PinGuessGameResult
        {
            GameId = game?.Id ?? 0,
            UserId = userId,
            GamePinId = gamePin.Id,
            Attempts = prevAttempts + 1,
            IsSolved = isCorrect,
            PlayedAt = DateTime.UtcNow
        };

        _context.PinGuessGameResults.Add(result);
        await _context.SaveChangesAsync();

        return new PinGuessResultDto
        {
            Attempts = result.Attempts,
            IsSolved = isCorrect,
            DigitStatuses = digitStatuses
        };
    }


    [HttpPost("addpoints/{points}")]
    public async Task<IActionResult> AddPoints(int points)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no válido.");

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound("Usuario no encontrado.");

        user.Points += points;
        await _context.SaveChangesAsync();

        return Ok(new { message = $"{points} puntos añadidos.", totalPoints = user.Points });
    }

    private List<int> GetDigitStatuses(string guess, string target)
    {
        var result = Enumerable.Repeat(3, PinLength).ToList(); // 1: Correcto, 2: Presente, 3: Ausente
        var used = new bool[PinLength];

        // Paso 1: dígitos correctos en posición
        for (int i = 0; i < PinLength; i++)
        {
            if (guess[i] == target[i])
            {
                result[i] = 1;
                used[i] = true;
            }
        }

        // Paso 2: dígitos presentes en otra posición
        for (int i = 0; i < PinLength; i++)
        {
            if (result[i] == 1) continue;

            for (int j = 0; j < PinLength; j++)
            {
                if (!used[j] && guess[i] == target[j])
                {
                    result[i] = 2;
                    used[j] = true;
                    break;
                }
            }
        }

        return result;
    }
}
