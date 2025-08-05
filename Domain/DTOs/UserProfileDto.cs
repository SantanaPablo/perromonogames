// MiJuegosWeb.Domain/DTOs/UserProfileDto.cs
namespace MiJuegosWeb.Domain.DTOs
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public int Points { get; set; }
        public int? RankingPosition { get; set; }
        public int? ClubId;
        public string? ClubName { get; set; }
        public string Role { get; set; } = string.Empty;
        public string? ProfilePictureUrl { get; set; }
    }
}
