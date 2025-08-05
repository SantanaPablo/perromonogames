using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.DTOs;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data;
using System.Security.Claims;
using MiJuegosWeb.Domain;
[ApiController]
[Route("api/[controller]")]
public class UserController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public UserController(ApplicationDbContext context)
    {
        _context = context;
    }

    [Authorize]
    [HttpGet("profile")]
    public async Task<ActionResult<UserProfileDto>> GetProfile()
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized();

        var user = await _context.Users
            .Include(u => u.Club) // Incluir el club si el usuario pertenece a uno
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
            return NotFound();

        return new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            FirstName = user.FirstName,
            LastName = user.LastName,
            PhoneNumber = user.PhoneNumber,
            Points = user.Points,
            Role = user.Role,
            ClubName = user.Club?.Name,
            ProfilePictureUrl = user.ProfilePictureUrl
        };
    }

    [Authorize]
    [HttpPut("update")]
    public async Task<IActionResult> UpdateProfile([FromBody] UserProfileDto dto)
    {
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
            return Unauthorized();

        var user = await _context.Users.FindAsync(userId);
        if (user == null)
            return NotFound();

        // Actualizar campos permitidos
        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.PhoneNumber = dto.PhoneNumber;
        user.ProfilePictureUrl = dto.ProfilePictureUrl;

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

    //[Authorize(Roles = "Admin")]
    //[HttpPut("{id}/role")]
    //public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateRoleDto dto)
    //{
    //    var user = await _context.Users.FindAsync(id);
    //    if (user == null)
    //        return NotFound();

    //    user.Role = dto.Role;
    //    _context.Users.Update(user);
    //    await _context.SaveChangesAsync();

    //    return Ok(new { message = "Rol actualizado con éxito" });
    //}

    //[Authorize(Roles = "Admin")]
    //[HttpPut("{id}/points")]
    //public async Task<IActionResult> UpdateUserPoints(int id, [FromBody] UpdatePointsDto dto)
    //{
    //    var user = await _context.Users.FindAsync(id);
    //    if (user == null)
    //        return NotFound();

    //    user.Points = dto.Points;
    //    _context.Users.Update(user);
    //    await _context.SaveChangesAsync();

    //    return Ok(new { message = "Puntos actualizados con éxito" });
    //}
}