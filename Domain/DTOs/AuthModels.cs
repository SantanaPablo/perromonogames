// MiJuegosWeb.Domain/DTOs/AuthModels.cs
using System.ComponentModel.DataAnnotations;

namespace MiJuegosWeb.Domain.DTOs
{
    public class RegisterRequestDto
    {
        [Required(ErrorMessage = "El nombre de usuario es requerido.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "El usuario debe tener entre 3 y 50 caracteres.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es requerida.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre es requerido.")]
        [StringLength(100, ErrorMessage = "El nombre no puede exceder los 100 caracteres.")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "El apellido es requerido.")]
        [StringLength(100, ErrorMessage = "El apellido no puede exceder los 100 caracteres.")]
        public string LastName { get; set; } = string.Empty;

        [Phone(ErrorMessage = "El número de teléfono no es válido.")]
        [StringLength(20, ErrorMessage = "El número de teléfono no puede exceder los 20 caracteres.")]
        public string? PhoneNumber { get; set; }
    }

    public class LoginRequestDto
    {
        [Required(ErrorMessage = "El nombre de usuario es requerido.")]
        public string Username { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es requerida.")]
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponseDto
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? Token { get; set; } // Para JWT
    }
}