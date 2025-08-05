using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data;
using System.Security.Claims;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly string _key = "ESTA_ES_LA_LLAVE_SECRETA_DEL_TOKEN";

    public AuthController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);

        // Podés agregar aquí un método para verificar hash de password en vez de comparar texto plano
        if (user == null || user.PasswordHash != dto.Password)
        {
            return Unauthorized(new AuthResponseDto
            {
                IsSuccess = false,
                Message = "Usuario o contraseña incorrectos."
            });
        }

        var token = JwtHelper.GenerateJwtToken(user.Id, user.Username, user.Role, _key);

        return Ok(new AuthResponseDto
        {
            IsSuccess = true,
            Token = token,
            Message = "Login exitoso"
        });
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        var usersOrderedByPoints = await _context.Users
    .OrderByDescending(u => u.Points)
    .Select(u => new { u.Id })
    .ToListAsync();

        // Buscar la posición del usuario actual
        var rankingPosition = usersOrderedByPoints.FindIndex(u => u.Id == user.Id) + 1; // +1 porque FindIndex es 0-based

        return new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            Points = user.Points,
            RankingPosition = rankingPosition,
            ClubName = user.Club?.Name ?? "Sin club",
            ProfilePictureUrl = user.ProfilePictureUrl
        };
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
        // Validación simple de existencia
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
        {
            return BadRequest(new AuthResponseDto
            {
                IsSuccess = false,
                Message = "El nombre de usuario ya está en uso."
            });
        }

        var newUser = new User
        {
            Username = dto.Username,
            PasswordHash = dto.Password, // ⚠️ IMPORTANTE: en producción usar hashing (ej. BCrypt)
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            Role = "Player" // o el rol por defecto que uses
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        return Ok(new AuthResponseDto
        {
            IsSuccess = true,
            Message = "Registro exitoso"
        });
    }
}
