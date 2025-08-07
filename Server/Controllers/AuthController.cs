using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data; // Tu contexto de base de datos
using System.Security.Claims;
using Microsoft.AspNetCore.Identity; // ¡Nueva importación para IPasswordHasher!

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly string _key = "ESTA_ES_LA_LLAVE_SECRETA_DEL_TOKEN"; // Considera mover esto a configuración
    private readonly IPasswordHasher<User> _passwordHasher; // ¡Inyectamos el hasher!

    public AuthController(ApplicationDbContext context, IPasswordHasher<User> passwordHasher) // Constructor actualizado
    {
        _context = context;
        _passwordHasher = passwordHasher; // Asignamos el hasher inyectado
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == dto.Username);

        // ¡CORRECCIÓN DE SEGURIDAD!
        // 1. Verifica si el usuario existe.
        // 2. Si existe, verifica la contraseña hasheada.
        if (user == null || _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.Password) == PasswordVerificationResult.Failed)
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

        var user = await _context.Users
            .Include(u => u.Club)
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        var usersOrderedByPoints = await _context.Users
            .OrderByDescending(u => u.Points)
            .Select(u => new { u.Id })
            .ToListAsync();

        var rankingPosition = usersOrderedByPoints.FindIndex(u => u.Id == user.Id) + 1;

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
            ProfilePictureUrl = user.ProfilePictureUrl,
            // No devolver contraseñas ni hashes aquí por seguridad
        };
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto)
    {
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
            // ¡CORRECCIÓN DE SEGURIDAD! Hashear la contraseña antes de guardarla
            PasswordHash = _passwordHasher.HashPassword(null, dto.Password), // El primer parámetro es el usuario, puede ser null para hashear
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            PhoneNumber = dto.PhoneNumber,
            Role = "Player"
        };

        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Opcional: Generar un token y loguear al usuario automáticamente después del registro
        // var token = JwtHelper.GenerateJwtToken(newUser.Id, newUser.Username, newUser.Role, _key);

        return Ok(new AuthResponseDto
        {
            IsSuccess = true,
            Message = "Registro exitoso"
            // Token = token, // Descomentar si quieres devolver el token aquí
        });
    }
}