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
public class RankingsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public RankingsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<List<UserProfileDto>>> GetRankings()
    {
        var users = await _context.Users
            .Include(u => u.Club)
            .OrderByDescending(u => u.Points)
            .ToListAsync();

        var rankingList = users.Select((u, index) => new UserProfileDto
        {
            Id = u.Id,
            Username = u.Username,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Role = u.Role,
            Points = u.Points,
            ClubName = u.Club?.Name,
            RankingPosition = index + 1,
            ProfilePictureUrl = u.ProfilePictureUrl // si lo agregás
        }).ToList();

        return rankingList;
    }
}
