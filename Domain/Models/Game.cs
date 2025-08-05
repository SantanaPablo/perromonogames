// MiJuegosWeb.Domain/Models/Game.cs
using System.Collections.Generic;

namespace MiJuegosWeb.Domain.Models
{
    public class Game
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } // Nullable
    }
}
