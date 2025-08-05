// MiJuegosWeb.Domain/Models/User.cs
using System;
using System.Collections.Generic;

namespace MiJuegosWeb.Domain.Models
{
    public class User
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; } // Nullable
        public int Points { get; set; }
        public int? RankingPosition { get; set; } // Nullable
        public int? ClubId { get; set; } // Nullable
        public Club? Club { get; set; } // Navigation property (nullable)
        public string Role { get; set; } = "Player";
        public string? ProfilePictureUrl { get; set; } // Nullable
        public DateTime CreatedAt { get; set; }
    }
}