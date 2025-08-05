using System.ComponentModel.DataAnnotations;

namespace MiJuegosWeb.Domain.Models
{
    public class GamePin
    {
        public int Id { get; set; }
        public int GameId { get; set; }
        public string Pin { get; set; } = string.Empty;
        public bool IsCommon { get; set; } = true;
        public DateTime CreatedAt { get; set; }
    }

    public class PinGuessGameResult
    {
        public int Id { get; set; }
        public int GameId { get; set; }
        public int UserId { get; set; }
        public int GamePinId { get; set; }
        public int Attempts { get; set; }
        public int TimeTakenSeconds { get; set; }
        public bool IsSolved { get; set; }
        public DateTime PlayedAt { get; set; }
    }
}