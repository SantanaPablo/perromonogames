using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Domain.Models;
using MiJuegosWeb.Server.Data;

namespace MiJuegosWeb.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ClubController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public ClubController(ApplicationDbContext context)
        {
            _context = context;
        }

        [HttpPost("create")]
        public async Task<IActionResult> CreateClub([FromBody] Club club)
        {
            if (await _context.Clubs.AnyAsync(c => c.Name == club.Name))
                return BadRequest("Ya existe un club con ese nombre.");

            club.CreatedAt = DateTime.UtcNow;
            _context.Clubs.Add(club);
            await _context.SaveChangesAsync();
            return Ok(club);
        }
    }
}
