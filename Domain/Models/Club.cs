// MiJuegosWeb.Domain/Models/Club.cs
using System;
using System.Collections.Generic;

namespace MiJuegosWeb.Domain.Models
{
    public class Club
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; } // Nullable
        public string? ClubImageUrl { get; set; } // Nullable
        public DateTime CreatedAt { get; set; }
        public ICollection<User>? Members { get; set; } // Navigation property
    }
}