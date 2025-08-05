// MiJuegosWeb.Domain/Models/ClubGameRanking.cs
using System;

namespace MiJuegosWeb.Domain.Models
{
    public class ClubGameRanking
    {
        public int Id { get; set; }
        public int ClubId { get; set; }
        public Club? Club { get; set; }
        public int GameId { get; set; }
        public Game? Game { get; set; }
        public int Score { get; set; }
        public DateTime LastUpdated { get; set; }
    }
}