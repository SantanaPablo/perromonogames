using System.ComponentModel.DataAnnotations;

namespace MiJuegosWeb.Domain.Models
{
    public class GameWord
    {
        public int Id { get; set; }
        public int GameId { get; set; }

        // La columna Word ya no necesita ser única
        [Required]
        public string Word { get; set; } = string.Empty;

        public int WordLength { get; set; }
        public DateTime CreatedAt { get; set; }
        public Game? Game { get; set; }
        public bool IsCommon { get; set; } = true;
    }
}