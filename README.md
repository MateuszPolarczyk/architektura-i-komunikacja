# ParkingSpot — System rezerwacji miejsc parkingowych

Aplikacja webowa do rezerwacji miejsc parkingowych w architekturze
**klient–serwer**: backend **Django + Django REST Framework** (REST API + baza
danych) oraz frontend **React (Vite)** z mapą **Leaflet**, działający również
**offline** dzięki lokalnej bazie **IndexedDB** i synchronizacji.

Projekt na przedmiot *„Architektura i komunikacja między systemami i bazami danych”*.

---

## 1. Ogólne założenia projektu

Budujemy system rezerwacji miejsc parkingowych. Użytkownik loguje się, przegląda
parkingi (lista + mapa), wybiera wolne miejsce, rezerwuje je na konkretny
przedział czasu i zarządza swoimi rezerwacjami. System składa się z:

- **serwera z REST API** (Django REST Framework),
- **centralnej bazy danych** (SQLite / opcjonalnie PostgreSQL),
- **aplikacji webowej** (React) korzystającej z API, responsywnej, z **lokalną
  bazą danych** (IndexedDB) zapewniającą tryb offline i synchronizację.

## 2. Podział zadań w zespole

> Zespół (uzupełnić wg. karty projektu — grupa IAiSC_gr4):
> Amadeusz Skorupka, Agnieszka Skoczylas, Mateusz Polarczyk.

| Obszar | Zakres |
|--------|--------|
| **Backend / API** | modele, REST API, JWT, walidacja konfliktów, obsługa błędów, seed |
| **Frontend / UI** | layout, strony, mapa Leaflet, widoki rezerwacji, responsywność |
| **Offline / sync + DevOps** | IndexedDB, outbox, synchronizacja, dokumentacja, Git |

(Praca z użyciem systemu kontroli wersji **Git**.)

## 3. Zastosowane technologie

| Warstwa | Technologia |
|---------|-------------|
| Backend | Python 3.9+, **Django 4.2**, **Django REST Framework**, SimpleJWT (JWT), django-cors-headers, django-filter |
| Baza centralna | SQLite (domyślnie), gotowe pod PostgreSQL/MySQL |
| Frontend | **React 19**, Vite, React Router, Axios, React-Leaflet / Leaflet |
| Baza lokalna | **IndexedDB** (biblioteka `idb`) — tryb offline + outbox |
| Publiczne API | OpenStreetMap (mapy), Open-Meteo (pogoda) |

---

## 4. Funkcjonalności

**Użytkownicy i bezpieczeństwo:** rejestracja/logowanie (email + hasło),
autoryzacja **JWT** (access + refresh, automatyczne odświeżanie), wylogowanie z
unieważnieniem tokenu.

**Parkingi i miejsca:** lista parkingów (nazwa, adres, liczba miejsc, cena,
liczba wolnych), podgląd miejsc ze **statusem na żywo** (wolne / zarezerwowane /
zajęte / niedostępne), wyszukiwanie i filtrowanie (tekst, miasto, min. wolnych
miejsc, sortowanie), **mapa Leaflet**.

**Rezerwacje (pełny CRUD):** tworzenie na wybrany czas, podgląd
aktywnych/historycznych, zmiana terminu (PATCH), anulowanie, usuwanie, oraz
**walidacja konfliktów** (blokada nakładających się rezerwacji tego samego miejsca).

**Tryb offline:** odczyt z lokalnej bazy gdy brak sieci, kolejkowanie zmian
(outbox), automatyczna **synchronizacja** po odzyskaniu połączenia i obsługa
**de-synchronizacji** (konflikt zgłoszony użytkownikowi).

**Dodatkowo:** pulpit ze statystykami, widget pogody (publiczne API), panel
administracyjny Django (`/admin/`).

---

## 5. Uruchomienie

### Backend (Django API)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed             # przykładowe dane + konto demo
python manage.py runserver        # API: http://127.0.0.1:8000
```
Konto demo: **demo@parkingspot.dev** / **demo12345**

### Frontend (React)
```bash
cd frontend
npm install
npm run dev                       # http://localhost:5173
```
> Otwórz **http://localhost:5173** (użyj `localhost`, nie `127.0.0.1` — Vite na
> macOS nasłuchuje po IPv6). Adres API: `frontend/.env` (`VITE_API_URL`).

---

## 6. Dokumentacja szczegółowa

- **[docs/API.md](docs/API.md)** — opis endpointów, przykłady zapytań i odpowiedzi, format błędów.
- **[docs/DATABASE.md](docs/DATABASE.md)** — schemat bazy centralnej (ER) i lokalnej (IndexedDB), logika synchronizacji.

---

## 7. Jak testować tryb offline (demo synchronizacji)

1. Zaloguj się i wejdź na listę parkingów (dane zapiszą się w cache).
2. W DevTools przeglądarki → **Network → Offline** (albo wyłącz Wi-Fi).
3. Wskaźnik w pasku górnym zmieni się na **Offline**. Strony nadal działają
   (dane z IndexedDB). Utwórz/anuluj rezerwację — pojawi się znacznik „offline”
   i licznik w kolejce.
4. Wróć **Online** — aplikacja automatycznie zsynchronizuje kolejkę.
5. Aby zobaczyć obsługę **de-synchronizacji**: będąc offline zarezerwuj miejsce,
   które w międzyczasie (z innego konta/okna) zostanie zajęte — po powrocie online
   pojawi się baner „Konflikt synchronizacji”.

---

## 8. Architektura (przepływ)

```
React (UI)  ──►  warstwa danych (offline/store.js)
                      │  online ──► Axios ──► REST API (DRF) ──► baza centralna (SQLite)
                      │                         ▲   JWT (Authorization: Bearer)
                      └─ offline ─► IndexedDB (cache + outbox)
                                         │ event "online"
                                         └──► sync.js ──► odtworzenie kolejki na serwerze
```

## 9. Mapowanie na kartę przedmiotu (punktacja)

| Element | Gdzie w projekcie |
|---------|-------------------|
| Dokumentacja (API, schemat DB, założenia) | `README.md`, `docs/API.md`, `docs/DATABASE.md` |
| Serwer + REST API | `backend/` (Django + DRF, czyste endpointy) |
| Integracja z bazą | Django ORM → SQLite |
| Operacje CRUD | rezerwacje: Create/Read/Update(PATCH+cancel)/Delete |
| Uwierzytelnianie | JWT (SimpleJWT), refresh + blacklist |
| Obsługa błędów | jednolity `exception_handler` + obsługa po stronie klienta |
| UI/UX | responsywny interfejs (React), motyw zielono-biały |
| Używanie API | pobieranie i wyświetlanie danych + publiczne API (mapy, pogoda) |
| Lokalna baza danych | IndexedDB (`idb`) — tryb offline |
| Synchronizacja danych | outbox + auto-sync + obsługa konfliktów (de-sync) |
| Współpraca / Git | repozytorium Git, podział zadań |
# architektura-i-komunikacja
