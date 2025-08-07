// MiJuegosWeb.Domain/DTOs/UserProfileDto.cs
namespace MiJuegosWeb.Domain.DTOs
{
    public class UpdateUserProfileDto
    {
        // Campos que el usuario puede actualizar
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? PhoneNumber { get; set; }
        public string? ProfilePictureUrl { get; set; }

        // Campos para el cambio de contraseña
        public string? OldPassword { get; set; }
        public string? NewPassword { get; set; }
    }
}