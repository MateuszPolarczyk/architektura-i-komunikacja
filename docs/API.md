# Dokumentacja API — ParkingSpot

Bazowy URL: `http://127.0.0.1:8000/api`

Wszystkie odpowiedzi i żądania używają formatu **JSON**. Komunikacja oparta jest
na protokole **HTTP** i standardowych metodach **GET / POST / PATCH / DELETE**
(REST).

## Uwierzytelnianie

API używa **JWT** (JSON Web Token, biblioteka SimpleJWT). Po zalogowaniu klient
otrzymuje parę tokenów:

- `access` — krótki (30 min), wysyłany w każdym żądaniu w nagłówku
  `Authorization: Bearer <access>`,
- `refresh` — długi (7 dni), służy do odświeżenia tokenu `access`.

Endpointy rezerwacji i `/dashboard/stats/` wymagają nagłówka `Authorization`.
Endpointy parkingów są publiczne (do odczytu).

### Format błędów

Wszystkie błędy mają jednolitą strukturę (custom exception handler). Komunikaty
są w języku polskim (serwer ustawiony na `LANGUAGE_CODE = "pl"`, więc tłumaczone
są również wbudowane komunikaty Django/DRF/SimpleJWT):

```json
{
  "error": {
    "status": 400,
    "type": "ValidationError",
    "detail": { "non_field_errors": ["To miejsce jest już zarezerwowane w wybranym przedziale czasu."] }
  }
}
```

Przykłady komunikatów:

```json
// 400 — rezerwacja w przeszłości
{ "error": { "status": 400, "type": "ValidationError",
  "detail": { "start_time": ["Nie można zarezerwować miejsca w przeszłości."] } } }

// 401 — błędne dane logowania
{ "error": { "status": 401, "type": "AuthenticationFailed",
  "detail": { "detail": "Nie znaleziono aktywnego konta dla podanych danych uwierzytelniających" } } }

// 400 — za słabe hasło przy rejestracji
{ "error": { "status": 400, "type": "ValidationError",
  "detail": { "password": ["To hasło jest za krótkie. Musi zawierać co najmniej 8 znaków."] } } }
```

| Kod | Znaczenie |
|-----|-----------|
| 400 | Błąd walidacji (np. konflikt rezerwacji, daty w przeszłości, słabe hasło) |
| 401 | Brak / nieważny token lub błędne dane logowania |
| 403 | Brak uprawnień |
| 404 | Nie znaleziono zasobu |

---

## Auth — `/api/auth/`

### POST `/auth/register/`
Rejestracja użytkownika.
```json
// request
{ "email": "jan@example.com", "first_name": "Jan", "last_name": "Kowalski",
  "password": "tajneHaslo1", "password2": "tajneHaslo1" }
// 201
{ "id": 2, "email": "jan@example.com", "first_name": "Jan", "last_name": "Kowalski" }
```

### POST `/auth/login/`
```json
// request
{ "email": "demo@parkingspot.dev", "password": "demo12345" }
// 200
{ "access": "<jwt>", "refresh": "<jwt>",
  "user": { "id": 1, "email": "demo@parkingspot.dev", "first_name": "Demo", "last_name": "User" } }
```

### POST `/auth/refresh/`
```json
{ "refresh": "<jwt>" }   // -> { "access": "<jwt>", "refresh": "<jwt>" }
```

### POST `/auth/logout/`
Unieważnia token `refresh` (blacklist). `{ "refresh": "<jwt>" }` → `205`.

### GET `/auth/me/`
Zwraca dane zalogowanego użytkownika. (PATCH aktualizuje imię/nazwisko.)

---

## Parkingi — `/api/parkings/`

### GET `/parkings/`
Lista parkingów. Parametry zapytania:

| Parametr | Przykład | Opis |
|----------|----------|------|
| `search` | `?search=Rynek` | szuka w nazwie / adresie / mieście |
| `city` | `?city=Wrocław` | filtr po mieście |
| `min_available` | `?min_available=5` | tylko parkingi z ≥ N wolnymi miejscami |
| `ordering` | `?ordering=hourly_rate` | sortowanie (`name`, `hourly_rate`, `-hourly_rate`) |

```json
// 200 (paginacja DRF)
{ "count": 4, "next": null, "previous": null, "results": [
  { "id": 1, "name": "Parking Rynek", "address": "Rynek 1", "city": "Wrocław",
    "latitude": "51.110000", "longitude": "17.031000", "hourly_rate": "8.00",
    "total_spots": 12, "available_spots": 11 } ] }
```

> **`available_spots`** — liczba aktywnych miejsc bez **bieżącej lub przyszłej**
> potwierdzonej rezerwacji (tj. każda potwierdzona rezerwacja z `end_time > teraz`
> blokuje miejsce). `total_spots` to liczba wszystkich miejsc parkingu.

### GET `/parkings/{id}/`
Szczegóły parkingu wraz z listą miejsc i ich **statusem liczonym na żywo**:

| Status | Znaczenie |
|--------|-----------|
| `free` | wolne (brak potwierdzonej rezerwacji bieżącej lub przyszłej) |
| `occupied` | potwierdzona rezerwacja trwa **teraz** |
| `reserved` | potwierdzona rezerwacja zaplanowana w **przyszłości** |
| `inactive` | miejsce wyłączone (`is_active = false`, np. serwis) |

`spot_type`: `standard` / `electric` (ładowarka EV) / `disabled` (dla niepełnosprawnych).

```json
{ "id": 1, "name": "Parking Rynek", "available_spots": 11, "total_spots": 12,
  "description": "...", "spots": [
    { "id": 1, "label": "A-01", "spot_type": "standard", "is_active": true, "status": "reserved" } ] }
```

### GET `/spots/?parking={id}`
Lista miejsc, z filtrami `parking`, `spot_type`, `is_active`.

---

## Rezerwacje — `/api/reservations/` (wymaga JWT)

Pełny **CRUD**.

### GET `/reservations/?scope=active|history`
Rezerwacje zalogowanego użytkownika. `scope=active` — potwierdzone i niezakończone;
`scope=history` — anulowane lub zakończone.

### POST `/reservations/` — **Create**
```json
// request
{ "spot": 5, "start_time": "2026-07-01T10:00:00Z", "end_time": "2026-07-01T12:00:00Z" }
// 201
{ "id": 3, "spot": 5, "spot_label": "A-05", "parking_id": 1, "parking_name": "Parking Rynek",
  "start_time": "...", "end_time": "...", "status": "confirmed", "is_active": true }
```
Walidacja: koniec po początku, brak rezerwacji w przeszłości, **brak konfliktu**
czasowego z inną potwierdzoną rezerwacją tego samego miejsca.

### GET `/reservations/{id}/` — **Read**

### PATCH `/reservations/{id}/` — **Update** (zmiana terminu)
```json
{ "start_time": "2026-07-02T10:00:00Z", "end_time": "2026-07-02T12:00:00Z" }
```
Ponownie sprawdza konflikt (z wykluczeniem samej rezerwacji).

### POST `/reservations/{id}/cancel/`
Miękkie anulowanie (status → `cancelled`).

### DELETE `/reservations/{id}/` — **Delete**
Trwałe usunięcie. `204 No Content`.

---

## Dashboard — `/api/dashboard/stats/` (wymaga JWT)
Zagregowane liczniki do kafelków pulpitu.
```json
{ "parkings": 4, "total_spots": 72, "available_spots": 72,
  "my_active_reservations": 1, "my_total_reservations": 3 }
```
| Pole | Opis |
|------|------|
| `parkings` | liczba parkingów |
| `total_spots` | liczba wszystkich aktywnych miejsc |
| `available_spots` | aktywne miejsca bez bieżącej/przyszłej potwierdzonej rezerwacji |
| `my_active_reservations` | potwierdzone i niezakończone rezerwacje użytkownika |
| `my_total_reservations` | wszystkie rezerwacje użytkownika |

---

## Wyszukiwarka globalna (frontend)

Wyszukiwarka w pasku górnym nie ma osobnego endpointu — korzysta z istniejących:
- **parkingi** (nazwa / adres / miasto): `GET /parkings/?search=<q>`,
- **rezerwacje** (numer/`id`, nazwa parkingu, numer miejsca): filtrowane po stronie
  klienta z `GET /reservations/` (tylko rezerwacje zalogowanego użytkownika).

Działa również offline — dane pochodzą z lokalnej pamięci podręcznej (IndexedDB).

---

## Publiczne API (frontend)

- **OpenStreetMap** (kafelki mapy, przez Leaflet) — wizualizacja parkingów.
- **Open-Meteo** (`api.open-meteo.com`) — bieżąca pogoda na pulpicie (bez klucza API).
