using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MiJuegosWeb.Domain.Models; // Asegúrate de que este es el namespace de tu modelo User
using MiJuegosWeb.Server.Data; // Tu contexto de base de datos
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

[ApiController]
[Route("api/[controller]")] // La ruta base será /api/ProfilePicture
public class ProfilePictureController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _hostingEnvironment;

    public ProfilePictureController(ApplicationDbContext context, IWebHostEnvironment hostingEnvironment)
    {
        _context = context;
        _hostingEnvironment = hostingEnvironment;
    }

    [Authorize]
    [HttpPost("upload")] // La ruta completa será /api/ProfilePicture/upload
    public async Task<IActionResult> UploadProfilePicture(IFormFile file)
    {
        // 1. Obtener el ID del usuario desde el token JWT
        var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(userIdStr, out int userId))
        {
            return Unauthorized("ID de usuario no válido en el token.");
        }

        // 2. Validar el archivo
        if (file == null || file.Length == 0)
        {
            return BadRequest("No se ha seleccionado ningún archivo o el archivo está vacío.");
        }
        
        if (!file.ContentType.StartsWith("image/"))
        {
            return BadRequest("El archivo debe ser una imagen.");
        }

        // 3. Obtener el usuario de la base de datos
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            return NotFound("Usuario no encontrado.");
        }

        // 4. Lógica para guardar la imagen en el servidor
        var uploadsFolder = Path.Combine(_hostingEnvironment.WebRootPath, "fotos"); // Usamos la carpeta 'fotos'
        if (!Directory.Exists(uploadsFolder))
        {
            Directory.CreateDirectory(uploadsFolder);
        }

        // 5. Eliminar la foto de perfil anterior si existe
        if (!string.IsNullOrEmpty(user.ProfilePictureUrl))
        {
            var oldFilePath = Path.Combine(_hostingEnvironment.WebRootPath, user.ProfilePictureUrl.TrimStart('/'));
            if (System.IO.File.Exists(oldFilePath))
            {
                System.IO.File.Delete(oldFilePath);
            }
        }

        // 6. Generar un nombre de archivo único y seguro
        var fileExtension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var uniqueFileName = $"{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        // 7. Guardar el nuevo archivo
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // 8. Actualizar la URL de la foto de perfil en la base de datos
        var imageUrl = $"/fotos/{uniqueFileName}";
        user.ProfilePictureUrl = imageUrl;
        await _context.SaveChangesAsync();

        return Ok(new { Message = "Foto de perfil actualizada con éxito.", ImageUrl = imageUrl });
    }
}
