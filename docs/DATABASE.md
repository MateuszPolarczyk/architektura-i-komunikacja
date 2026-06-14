# Schemat bazy danych — ParkingSpot

System korzysta z **dwóch** baz danych:

1. **Centralna baza serwera** — SQLite (Django ORM); łatwo wymienialna na
   PostgreSQL/MySQL przez zmianę `DATABASES` w `config/settings.py`.
2. **Lokalna baza klienta** — **IndexedDB** w przeglądarce (tryb offline).

---

## 1. Baza centralna (serwer)

### Diagram ER (tekstowy)

```
┌─────────────────────┐         ┌──────────────────────┐         ┌───────────────────────┐
│        User         │         │       Parking        │         │     ParkingSpot       │
├─────────────────────┤         ├──────────────────────┤         ├───────────────────────┤
│ id           PK      │         │ id            PK      │   1   * │ id             PK      │
│ email        UNIQUE  │         │ name                  │────────▶│ parking_id     FK ─────┼─┐
│ password (hash)      │         │ address               │         │ label                  │ │
│ first_name           │         │ city                  │         │ spot_type (enum)       │ │
│ last_name            │         │ description           │         │ is_active (bool)       │ │
│ is_staff / is_active │         │ latitude  (decimal)   │         │ UNIQUE(parking,label)  │ │
│ date_joined          │         │ longitude (decimal)   │         └───────────────────────┘ │
└─────────┬───────────┘         │ hourly_rate (decimal) │                     ▲              │
          │                     │ created_at            │                     │ 1            │
          │ 1                   └──────────────────────┘                     │              │
          │                                                                   │ *            │
          │                          ┌────────────────────────────┐          │              │
          │              *           │        Reservation         │          │              │
          └─────────────────────────▶├────────────────────────────┤◀─────────┘              │
                                     │ id            PK            │                          │
                                     │ user_id       FK ──────────┼──────────────────────────┘
                                     │ spot_id       FK            │
                                     │ start_time    datetime      │
                                     │ end_time      datetime      │
                                     │ status (confirmed|cancelled)│
                                     │ created_at    datetime      │
                                     │ INDEX(spot,status,start,end)│
                                     └────────────────────────────┘
```

### Tabele

**accounts_user** — użytkownik uwierzytelniany emailem (custom `AUTH_USER_MODEL`).
| Kolumna | Typ | Uwagi |
|---------|-----|-------|
| id | bigint PK | |
| email | varchar UNIQUE | login |
| password | varchar | hash (PBKDF2) |
| first_name, last_name | varchar | |
| is_active, is_staff, is_superuser | bool | |
| date_joined, last_login | datetime | |

**parking_parking**
| Kolumna | Typ | Uwagi |
|---------|-----|-------|
| id | bigint PK | |
| name, address, city, description | varchar/text | |
| latitude, longitude | decimal(9,6) | dla mapy Leaflet |
| hourly_rate | decimal(6,2) | cena/h |
| created_at | datetime | |

**parking_parkingspot**
| Kolumna | Typ | Uwagi |
|---------|-----|-------|
| id | bigint PK | |
| parking_id | FK → parking | ON DELETE CASCADE |
| label | varchar | np. „A-12” |
| spot_type | varchar(enum) | standard / electric / disabled |
| is_active | bool | |
| | | UNIQUE(parking_id, label) |

**reservations_reservation**
| Kolumna | Typ | Uwagi |
|---------|-----|-------|
| id | bigint PK | |
| user_id | FK → user | ON DELETE CASCADE |
| spot_id | FK → parkingspot | ON DELETE CASCADE |
| start_time, end_time | datetime | okno rezerwacji |
| status | varchar(enum) | confirmed / cancelled |
| created_at | datetime | |
| | | INDEX(spot, status, start_time, end_time) — przyspiesza wykrywanie konfliktów |

### Relacje
- `User 1 — * Reservation` (jeden użytkownik, wiele rezerwacji)
- `Parking 1 — * ParkingSpot`
- `ParkingSpot 1 — * Reservation`

Zapytania łączące kilka tabel (przykłady realnie używane w API):
- liczba wolnych miejsc parkingu = `ParkingSpot ⋈ Reservation` (miejsca aktywne
  bez nakładającej się rezerwacji „teraz”),
- lista rezerwacji użytkownika z nazwą parkingu = `Reservation ⋈ ParkingSpot ⋈ Parking`.

### Logika konfliktu rezerwacji
Dwie rezerwacje tego samego miejsca kolidują, gdy ich przedziały czasowe się
nakładają:
```
istniejąca.start_time < nowa.end_time  AND  istniejąca.end_time > nowa.start_time
(uwzględniane tylko rezerwacje status = confirmed)
```

---

## 2. Baza lokalna (klient, IndexedDB)

Nazwa: `parkingspot` (wersja 1). Obiekty (object stores):

| Store | Klucz | Zawartość |
|-------|-------|-----------|
| `parkings` | `id` | kopia parkingów/miejsc pobranych z API (cache do odczytu offline) |
| `reservations` | `id` | kopia rezerwacji użytkownika; rekordy utworzone offline mają tymczasowe `id < 0` i flagę `_pending` |
| `outbox` | `localId` (auto) | kolejka operacji wykonanych offline: `{ type: create\|cancel\|update\|delete, payload, status }` |
| `meta` | `key` | metadane (np. `lastSync`, zapamiętane `stats`) |

### Synchronizacja
- **Odczyt**: warstwa danych próbuje sieci; przy błędzie sieci czyta z cache.
- **Zapis offline**: operacja trafia do `outbox`, a cache jest aktualizowany
  optymistycznie (rekord oznaczony `_pending`).
- **Reconnect**: po zdarzeniu `online` kolejka `outbox` jest odtwarzana na
  serwerze w kolejności.
- **De-synchronizacja**: jeśli serwer odrzuci operację z kolejki (np. miejsce
  zostało w międzyczasie zajęte → 400), wpis dostaje status `failed`,
  optymistyczny rekord jest wycofywany, a użytkownik widzi baner „Konflikt
  synchronizacji”.
