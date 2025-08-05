// MiJuegosWeb.Domain/Models/WordGuessGameResult.cs
using System;

namespace MiJuegosWeb.Domain.Models
{
    public class WordGuessGameResult
    {
        public int Id { get; set; }
        public int GameId { get; set; }
        public Game? Game { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public int GameWordId { get; set; }
        public GameWord? GameWord { get; set; }
        public int Attempts { get; set; }
        public int? TimeTakenSeconds { get; set; } // Nullable
        public bool IsSolved { get; set; }
        public DateTime PlayedAt { get; set; }
    }
}