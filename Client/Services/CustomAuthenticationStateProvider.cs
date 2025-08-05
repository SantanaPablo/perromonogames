// MiJuegosWeb.Client/Services/CustomAuthenticationStateProvider.cs
using Blazored.LocalStorage;
using Microsoft.AspNetCore.Components.Authorization;
using System.Net.Http.Headers; // Aún necesitas este using, pero no para asignar al HttpClient
using System.Security.Claims;
using System.Text.Json;

namespace MiJuegosWeb.Client.Services
{
    public class CustomAuthenticationStateProvider : AuthenticationStateProvider
    {
        private readonly ILocalStorageService _localStorage;
        // El HttpClient se inyecta, pero NO LO USAREMOS PARA MODIFICAR HEADERS DE AUTH AQUÍ.
        // Se mantiene si lo necesitas para otras cosas dentro de este servicio.
        private readonly HttpClient _httpClient;

        public CustomAuthenticationStateProvider(ILocalStorageService localStorage, HttpClient httpClient)
        {
            _localStorage = localStorage;
            _httpClient = httpClient; // Lo mantenemos si hay otras llamadas HTTP que no sean de autenticación pura.
        }

        public override async Task<AuthenticationState> GetAuthenticationStateAsync()
        {
            var token = await _localStorage.GetItemAsStringAsync("authToken");

            Console.WriteLine($"Token leído desde localStorage: {token}");

            var identity = new ClaimsIdentity();

            if (!string.IsNullOrWhiteSpace(token))
            {
                var cleanedToken = token.Trim('"');
                Console.WriteLine($"Token limpio: {cleanedToken}");

                try
                {
                    var claims = ParseClaimsFromJwt(cleanedToken);
                    identity = new ClaimsIdentity(claims, "jwt");

                    Console.WriteLine($"Claims parseados: {string.Join(", ", claims.Select(c => $"{c.Type}:{c.Value}"))}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Error al parsear token: {ex.Message}");
                }
            }

            return new AuthenticationState(new ClaimsPrincipal(identity));
        }

        // Llamado al iniciar sesión
        public void MarkUserAsAuthenticated(string token)
        {
            Console.WriteLine($"[AuthProvider] Marcando como autenticado: {token}");
            var identity = new ClaimsIdentity(ParseClaimsFromJwt(token), "jwt");
            var user = new ClaimsPrincipal(identity);
            NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(user)));
        }

        // Llamado al cerrar sesión
        public void MarkUserAsLoggedOut()
        {
            var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
            NotifyAuthenticationStateChanged(Task.FromResult(new AuthenticationState(anonymous)));
        }

        // Método auxiliar para parsear claims del JWT (TU CÓDIGO ANTERIOR, sin cambios relevantes)
        private IEnumerable<Claim> ParseClaimsFromJwt(string jwt)
        {
            var claims = new List<Claim>();
            var payload = jwt.Split('.')[1];
            var jsonBytes = ParseBase64WithoutPadding(payload);
            var keyValuePairs = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonBytes);

            if (keyValuePairs is null) return claims;

            // Opcional: Validación de expiración del token aquí. Si expira, puedes limpiar el token.
            if (keyValuePairs.TryGetValue("exp", out var exp) && long.TryParse(exp.ToString(), out var expVal))
            {
                var expiry = DateTimeOffset.FromUnixTimeSeconds(expVal);
                if (expiry < DateTimeOffset.UtcNow)
                {
                    // Si el token ha expirado, lo quitamos y devolvemos claims vacíos.
                    _ = _localStorage.RemoveItemAsync("authToken"); // Quita el token
                    return claims; // Devuelve claims vacíos
                }
            }

            // ... (resto de tu lógica para extraer claims como NameIdentifier, Name, Role) ...
            if (keyValuePairs.TryGetValue(ClaimTypes.NameIdentifier, out var userId))
                claims.Add(new Claim(ClaimTypes.NameIdentifier, userId.ToString()!));

            if (keyValuePairs.TryGetValue(ClaimTypes.Name, out var username))
                claims.Add(new Claim(ClaimTypes.Name, username.ToString()!));

            if (keyValuePairs.TryGetValue(ClaimTypes.Role, out var role))
            {
                if (role.ToString()!.StartsWith("["))
                {
                    var roles = JsonSerializer.Deserialize<string[]>(role.ToString()!) ?? Array.Empty<string>();
                    claims.AddRange(roles.Select(r => new Claim(ClaimTypes.Role, r)));
                }
                else
                {
                    claims.Add(new Claim(ClaimTypes.Role, role.ToString()!));
                }
            }

            return claims;
        }

        private byte[] ParseBase64WithoutPadding(string base64)
        {
            switch (base64.Length % 4)
            {
                case 2: base64 += "=="; break;
                case 3: base64 += "="; break;
            }
            return Convert.FromBase64String(base64);
        }
    }
}