
using System;

namespace MiJuegosWeb.Domain.Models
{
    public class DictionaryWord
    {
        public int Id { get; set; }
        public string Word { get; set; } = string.Empty;
        public int WordLength { get; set; }
    }
}