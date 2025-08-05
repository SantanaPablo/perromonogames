// MiJuegosWeb.Server/Services/DailyWordService.cs
using Microsoft.EntityFrameworkCore;
using MiJuegosWeb.Server.Data; // Tu DbContext
using MiJuegosWeb.Domain.Models; // Tus modelos de dominio

namespace MiJuegosWeb.Server.Services
{
    public class DailyWordService
    {
        private readonly ApplicationDbContext _context;

        public DailyWordService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<GameWord?> GetDailyWordAsync(int gameId, int wordLength)
        {
            // Lógica simple para empezar: obtener una palabra aleatoria de 5 letras para un GameId
            // Esto debería ser más sofisticado para asegurar "palabra del día" real,
            // que cambie cada 24h y no se repita pronto.
            var word = await _context.GameWords
                                     .Where(gw => gw.GameId == gameId && gw.WordLength == wordLength)
                                     .OrderBy(r => Guid.NewGuid()) // Orden aleatorio para una palabra "diferente" cada vez que se llama (no óptimo para producción)
                                     .FirstOrDefaultAsync();
            return word;
        }

        // Puedes añadir métodos para insertar palabras de ejemplo si quieres
        //public async Task AddInitialWordsAsync()
        //{
        //    if (!await _context.GameWords.AnyAsync(gw => gw.WordLength == 5 && gw.GameId == 1)) // Asegurarse de que el GameId 1 existe
        //    {
        //        // Asegúrate de que el juego con ID 1 ('Adivinar la Palabra') exista antes de esto
        //        var game = await _context.Games.FirstOrDefaultAsync(g => g.Id == 1);
        //        if (game == null)
        //        {
        //            game = new Game { Id = 1, Name = "Adivinar la Palabra", Description = "Juego diario de adivinar palabras" };
        //            _context.Games.Add(game);
        //            await _context.SaveChangesAsync();
        //        }

        //        _context.GameWords.AddRange(
        //            new GameWord { GameId = game.Id, Word = "PERRO", WordLength = 5, IsCommon = true, CreatedAt = DateTime.Now },
        //            new GameWord { GameId = game.Id, Word = "GATOS", WordLength = 5, IsCommon = true, CreatedAt = DateTime.Now },
        //            new GameWord { GameId = game.Id, Word = "CASAS", WordLength = 5, IsCommon = true, CreatedAt = DateTime.Now },
        //            new GameWord { GameId = game.Id, Word = "MESAS", WordLength = 5, IsCommon = true, CreatedAt = DateTime.Now },
        //            new GameWord { GameId = game.Id, Word = "LIBRO", WordLength = 5, IsCommon = true, CreatedAt = DateTime.Now }
        //        );
        //        await _context.SaveChangesAsync();
        //    }
        //}
    }
}