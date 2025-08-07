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
public class UserController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher<User> _passwordHasher;

    public UserController(ApplicationDbContext context, IPasswordHasher<User> passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
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

        // Para el ranking, se podría optimizar la consulta para evitar cargar todos los usuarios.
        // Aquí se mantiene tu lógica.
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
            PhoneNumber = user.PhoneNumber,
            Points = user.Points,
            RankingPosition = rankingPosition,
            Role = user.Role,
            ClubName = user.Club?.Name,
            ProfilePictureUrl = user.ProfilePictureUrl
        };
    }

    [Authorize]
    [HttpPut("update")]
    // Se recomienda usar un DTO específico para la actualización para mayor claridad
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateUserProfileDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized("ID de usuario no válido en el token.");

        // Recuperar el usuario del contexto
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound("Usuario no encontrado.");

        // Lógica para CAMBIAR LA CONTRASEÑA
        // Solo si ambos campos (OldPassword y NewPassword) están presentes, intentamos cambiarla.
        if (!string.IsNullOrEmpty(dto.OldPassword) && !string.IsNullOrEmpty(dto.NewPassword))
        {
            // 1. Verificar la contraseña antigua
            var passwordVerificationResult = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.OldPassword);

            if (passwordVerificationResult == PasswordVerificationResult.Failed)
            {
                return BadRequest(new { message = "La contraseña actual es incorrecta." });
            }

            // 2. Validar la nueva contraseña de forma más robusta
            // ¡Aquí puedes añadir reglas de validación de complejidad!
            // Por ejemplo: largo mínimo, mayúsculas, minúsculas, números, símbolos.
            if (dto.NewPassword.Length < 8)
            {
                return BadRequest(new { message = "La nueva contraseña debe tener al menos 8 caracteres." });
            }

            // 3. Hashear la nueva contraseña y actualizarla
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        }
        else if (!string.IsNullOrEmpty(dto.OldPassword) || !string.IsNullOrEmpty(dto.NewPassword))
        {
            // Si solo se proporciona uno de los dos campos, es un error de la solicitud
            return BadRequest(new { message = "Para cambiar la contraseña, debe proporcionar tanto la contraseña actual como la nueva." });
        }

        // Actualizar otros campos permitidos del perfil solo si se han proporcionado en el DTO
        if (!string.IsNullOrEmpty(dto.FirstName)) user.FirstName = dto.FirstName;
        if (!string.IsNullOrEmpty(dto.LastName)) user.LastName = dto.LastName;
        if (!string.IsNullOrEmpty(dto.PhoneNumber)) user.PhoneNumber = dto.PhoneNumber;
        if (!string.IsNullOrEmpty(dto.ProfilePictureUrl)) user.ProfilePictureUrl = dto.ProfilePictureUrl;

        _context.Users.Update(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Perfil actualizado con éxito" });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserProfileDto>>> GetAllUsers()
    {
        return await _context.Users
            .Select(u => new UserProfileDto
            {
                Id = u.Id,
                Username = u.Username,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = u.Role,
                Points = u.Points,
                ClubId = u.ClubId
            })
            .ToListAsync();
    }


}