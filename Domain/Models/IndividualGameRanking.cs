// MiJuegosWeb.Domain/Models/IndividualGameRanking.cs
using System;

namespace MiJuegosWeb.Domain.Models
{
    public class IndividualGameRanking
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User? User { get; set; }
        public int GameId { get; set; }
        public Game? Game { get; set; }
        public int Score { get; set; }
        public int? BestAttempts { get; set; } // Nullable
        public int? BestTimeSeconds { get; set; } // Nullable
        public DateTime LastPlayedAt { get; set; }
    }
}