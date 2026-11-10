# TMDb API v3: Universal Request Architecture & Complete Endpoint Specification

> **Official Specification & Reference Manual for CinemaVerse Pro**  
> **Source Standard:** [TMDb Official Developer Guide](https://developer.themoviedb.org/reference/getting-started)  
> **Target Version:** The Movie Database (TMDb) API v3  
> **Engine Scope:** CinemaVerse Pro Universal Streaming Platform (Web, Android TV, Mobile PWA/APK)

---

## Table of Contents
1. [Core Architecture & Authentication](#1-core-architecture--authentication)
2. [Bidirectional Cross-ID Conversion (TMDb ↔ IMDb ↔ TVDB)](#2-bidirectional-cross-id-conversion-tmdb--imdb--tvdb)
   - *Case Study: Scam 1992, Interstellar, and Multi-Server Alignment*
3. [The `append_to_response` Mega-Query Pattern](#3-the-append_to_response-mega-query-pattern)
4. [Movies API Endpoints](#4-movies-api-endpoints)
5. [TV Series API Endpoints](#5-tv-series-api-endpoints)
6. [TV Seasons & Episodes API Endpoints (Real Stills & Overviews)](#6-tv-seasons--episodes-api-endpoints)
7. [Universal Search & Autocomplete Engine](#7-universal-search--autocomplete-engine)
8. [Parametric Discover Engine (OTT & Genre Filtering)](#8-parametric-discover-engine)
9. [Trending & Curated Top Lists](#9-trending--curated-top-lists)
10. [Collections & Franchises Engine](#10-collections--franchises-engine)
11. [Watch Providers & Indian OTT Ecosystem (JustWatch Integration)](#11-watch-providers--indian-ott-ecosystem)
12. [People, Cast, & Crew Filmographies](#12-people-cast--crew-filmographies)
13. [Interactive User Personalization (Ratings, Favorites, Watchlist)](#13-interactive-user-personalization)
14. [Delta-Sync & Changelog Auditing Engine](#14-delta-sync--changelog-auditing-engine)
15. [System Taxonomies: Genres, Certifications, Companies, Networks](#15-system-taxonomies)
16. [Image CDN Delivery & Anti-Blocking Proxy Architecture](#16-image-cdn-delivery--anti-blocking-proxy-architecture)
17. [CinemaVerse Pro Feature Mapping Matrix](#17-cinemaverse-pro-feature-mapping-matrix)

---

## 1. Core Architecture & Authentication

### 1.1 Base URLs
* **Production API Base URL:**  
  `https://api.themoviedb.org/3` (or `https://api.tmdb.org/3`)
* **Secure Image CDN Base URL:**  
  `https://image.tmdb.org/t/p/`
* **Local Zero-Block Anti-ISP Proxy Base:**  
  `/api/tmdb-image/` *(Proxies through server backend to bypass Indian ISP DNS blocks)*

### 1.2 Authentication Methods
TMDb supports two primary authentication schemes for all v3 requests:

#### Method A: Bearer Token (HTTP Authorization Header — Recommended)
```http
GET /3/movie/157336 HTTP/1.1
Host: api.themoviedb.org
Authorization: Bearer <TMDB_READ_ACCESS_TOKEN>
Accept: application/json
```

#### Method B: API Key (URL Query Parameter)
```http
GET /3/movie/157336?api_key=<TMDB_API_KEY> HTTP/1.1
Host: api.themoviedb.org
Accept: application/json
```

### 1.3 Rate Limits & Headers
* **Standard Rate Limit:** ~50 requests per second under Cloudflare protection (legacy 40/10s rule retired).
* **Response Format:** `application/json;charset=utf-8`
* **Common Response Status Codes:**
  * `200 OK`: Request succeeded.
  * `401 Unauthorized`: Invalid or missing API key / Bearer token.
  * `404 Not Found`: Media ID or resource does not exist.
  * `422 Unprocessable Entity`: Validation failure or missing required parameter.
  * `429 Too Many Requests`: Rate limit exceeded (check `Retry-After` header).

---

## 2. Bidirectional Cross-ID Conversion (TMDb ↔ IMDb ↔ TVDB)

### Why Cross-ID Resolution is Vital for Streaming Servers
CinemaVerse Pro routes video playback across 10 distinct streaming servers:
* **Servers requiring IMDb IDs (`tt...`):** AutoEmbed, Vidsrc, SuperStream, 2Embed, VidSrc.to.
* **Servers requiring TMDb IDs (numeric):** Vidly Pro VIP, SmashyStream, MultiEmbed, Player4U.

When a media item is played or searched under one identifier, CinemaVerse resolves its counterpart in real-time. Without bidirectional conversion, servers receive mismatched IDs (e.g. playing the wrong movie or buffering infinitely).

---

### 2.1 Converting IMDb ID → TMDb ID (`/find/{external_id}`)
Use this when you have an IMDb ID (`tt...`) and need the numeric TMDb ID.

* **HTTP Method:** `GET`
* **Path:** `/3/find/{external_id}`
* **Required Query Parameter:** `external_source=imdb_id`
* **Allowed Sources:** `imdb_id`, `tvdb_id`, `wikidata_id`, `facebook_id`, `instagram_id`, `twitter_id`, `tiktok_id`

#### Request:
```bash
curl -X GET "https://api.tmdb.org/3/find/tt12392504?external_source=imdb_id&api_key=fe30ba97956d6c5afafc72b84941712d"
```

#### Response Structure:
```json
{
  "movie_results": [],
  "person_results": [],
  "tv_results": [
    {
      "id": 111188,
      "name": "Scam 1992: The Harshad Mehta Story",
      "original_name": "Scam 1992: The Harshad Mehta Story",
      "poster_path": "/cBVPwBSVNSVtQocQfyHPFqoIohj.jpg",
      "backdrop_path": "/tTYP1npvBU90NthceezScfXGiOl.jpg",
      "media_type": "tv",
      "first_air_date": "2020-10-09",
      "vote_average": 8.3,
      "vote_count": 160
    }
  ],
  "tv_episode_results": [],
  "tv_season_results": []
}
```

---

### 2.2 Converting TMDb ID → IMDb ID (`/{type}/{id}/external_ids`)
Use this when you have a TMDb ID and need the official IMDb ID for playback on IMDb-dependent servers.

#### A. Movies: `GET /3/movie/{movie_id}/external_ids`
```bash
curl -X GET "https://api.tmdb.org/3/movie/157336/external_ids?api_key=fe30ba97956d6c5afafc72b84941712d"
```
**Response:**
```json
{
  "id": 157336,
  "imdb_id": "tt0816692",
  "wikidata_id": "Q13417189",
  "facebook_id": "Interstellarmovie",
  "instagram_id": "interstellarmovie",
  "twitter_id": "Interstellar"
}
```

#### B. TV Series: `GET /3/tv/{series_id}/external_ids`
```bash
curl -X GET "https://api.tmdb.org/3/tv/111188/external_ids?api_key=fe30ba97956d6c5afafc72b84941712d"
```
**Response:**
```json
{
  "id": 111188,
  "imdb_id": "tt12392504",
  "tvdb_id": 389680,
  "wikidata_id": "Q100709273"
}
```

#### C. TV Episodes: `GET /3/tv/{series_id}/season/{season_number}/episode/{episode_number}/external_ids`
```bash
curl -X GET "https://api.tmdb.org/3/tv/66732/season/1/episode/1/external_ids?api_key=fe30ba97956d6c5afafc72b84941712d"
```
**Response:**
```json
{
  "id": 1198665,
  "imdb_id": "tt4593118",
  "tvdb_id": 5667389
}
```

---

### 2.3 Real-World Case Study: Scam 1992
> [!NOTE]
> * **User Problem:** When playing *Scam 1992 (The Harshad Mehta Story)*, one server played correctly while another server played the wrong movie or failed.
> * **Root Cause:** The TMDb ID is `111188`, but its linked IMDb ID is `tt12392504` (not `tt11118884`). Servers expecting IMDb were passed unmapped IDs.
> * **Solution:** With bidirectional lookup, passing either `111188` or `tt12392504` instantly pairs with its counterpart, ensuring 100% server synchronicity across all 10 servers.

---

## 3. The `append_to_response` Mega-Query Pattern

Rather than performing 8 to 10 sequential HTTP requests to collect title info, cast, trailers, logos, certifications, and recommendations, TMDb's `append_to_response` parameter bundles all sub-resources into **a single HTTP round-trip**.

### 3.1 Movie Mega-Query
```http
GET /3/movie/{movie_id}?append_to_response=credits,videos,images,release_dates,watch/providers,external_ids,recommendations,similar,keywords HTTP/1.1
Host: api.tmdb.org
Authorization: Bearer <TOKEN>
```
* **Extracted in 1 Call:**
  1. Base Details (title, overview, runtime, tagline, genres, budget, revenue)
  2. `credits`: Full cast list with profile photos and character names, directors, writers
  3. `videos`: Official YouTube 4K/HD trailers and teasers
  4. `images`: High-res backdrops, posters, and transparent PNG/SVG title logos (`images.logos`)
  5. `release_dates`: Indian certification (`U`, `UA`, `A`) and international ratings (PG-13, R)
  6. `watch/providers`: Indian streaming platforms (Netflix, Prime, Hotstar, Zee5, etc.)
  7. `external_ids`: `imdb_id` for Server 2–10 stream URL construction
  8. `recommendations`: Algorithmic "More Like This" recommendations
  9. `keywords`: Plot and mood tags

### 3.2 TV Series Mega-Query
```http
GET /3/tv/{series_id}?append_to_response=credits,videos,images,content_ratings,watch/providers,external_ids,recommendations,similar,keywords,aggregate_credits HTTP/1.1
Host: api.tmdb.org
Authorization: Bearer <TOKEN>
```
* **Extracted in 1 Call:**
  1. Base Series Details (name, overview, number of seasons, number of episodes)
  2. `content_ratings`: Indian TV certification (`U/A 16+`, `U/A 13+`, `A`)
  3. `aggregate_credits`: Total episode appearances for all actors across every season
  4. `images.logos`: Transparent title logos for hero billboards
  5. `videos`: Official series launch trailer
  6. `external_ids`: Series IMDb ID (`tt...`) and TVDB ID

---

## 4. Movies API Endpoints

| Method | Endpoint Path | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/3/movie/{movie_id}` | `language`, `append_to_response` | Primary details, overview, runtime, tagline, budget, status |
| `GET` | `/3/movie/{movie_id}/credits` | `language` | Cast and crew lists with character and job roles |
| `GET` | `/3/movie/{movie_id}/images` | `include_image_language`, `language` | Posters, backdrops, and transparent title logos |
| `GET` | `/3/movie/{movie_id}/videos` | `language` | Official YouTube trailers, clips, teasers, behind-the-scenes |
| `GET` | `/3/movie/{movie_id}/release_dates` | None | Age ratings & theatrical/digital release dates by country (`IN`, `US`) |
| `GET` | `/3/movie/{movie_id}/watch/providers` | None | Streaming, rental, and buy availability by country |
| `GET` | `/3/movie/{movie_id}/external_ids` | None | Resolves IMDb, Wikidata, Facebook, Instagram, Twitter IDs |
| `GET` | `/3/movie/{movie_id}/recommendations` | `page`, `language` | Curated recommended movies based on user viewing patterns |
| `GET` | `/3/movie/{movie_id}/similar` | `page`, `language` | Similar movies based on shared genres and keywords |
| `GET` | `/3/movie/{movie_id}/keywords` | None | Plot keywords and thematic tags |
| `GET` | `/3/movie/{movie_id}/alternative_titles` | `country` | Regional titles (Hindi, Tamil, Telugu, Spanish, etc.) |
| `GET` | `/3/movie/{movie_id}/reviews` | `page`, `language` | Critic and user reviews with ratings |
| `GET` | `/3/movie/popular` | `page`, `language`, `region` | Current globally popular movies |
| `GET` | `/3/movie/top_rated` | `page`, `language`, `region` | All-time highest rated movies (min vote threshold) |
| `GET` | `/3/movie/now_playing` | `page`, `language`, `region` | Movies currently in theatres |
| `GET` | `/3/movie/upcoming` | `page`, `language`, `region` | Upcoming movies scheduled for release |

---

## 5. TV Series API Endpoints

| Method | Endpoint Path | Query Parameters | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/3/tv/{series_id}` | `language`, `append_to_response` | Primary series metadata, episode runtimes, seasons list |
| `GET` | `/3/tv/{series_id}/aggregate_credits` | `language` | Actor appearances totaled across all seasons and episodes |
| `GET` | `/3/tv/{series_id}/credits` | `language` | Main series cast and series creators |
| `GET` | `/3/tv/{series_id}/content_ratings` | None | Regional maturity certificates (`U/A 16+`, `TV-MA`, `18`) |
| `GET` | `/3/tv/{series_id}/images` | `include_image_language` | Series posters, backdrops, and title logos |
| `GET` | `/3/tv/{series_id}/videos` | `language` | Trailers, teasers, season promos |
| `GET` | `/3/tv/{series_id}/watch/providers` | None | Indian & global OTT platforms hosting the show |
| `GET` | `/3/tv/{series_id}/external_ids` | None | TVDB, IMDb (`tt...`), and social IDs |
| `GET` | `/3/tv/{series_id}/episode_groups` | None | Alternative viewing orders (e.g. Production Order, Story Arcs) |
| `GET` | `/3/tv/episode_group/{id}` | None | Fetches ordered episodes mapped to an episode group |
| `GET` | `/3/tv/{series_id}/recommendations` | `page`, `language` | Algorithmic TV show recommendations |
| `GET` | `/3/tv/{series_id}/similar` | `page`, `language` | Similar TV shows based on theme and genre |
| `GET` | `/3/tv/popular` | `page`, `language` | Current popular TV shows |
| `GET` | `/3/tv/top_rated` | `page`, `language` | All-time top rated TV shows |
| `GET` | `/3/tv/on_the_air` | `page`, `language` | Shows currently airing new episodes within 7 days |
| `GET` | `/3/tv/airing_today` | `page`, `language` | Shows with episodes broadcast today |

---

## 6. TV Seasons & Episodes API Endpoints

TMDb provides individual screenshot stills, true runtimes, and exact episode synopses for every TV season and episode.

### 6.1 Season Details: `GET /3/tv/{series_id}/season/{season_number}`
Returns the entire episode roster for a season with thumbnail stills.

```bash
curl -X GET "https://api.tmdb.org/3/tv/66732/season/1?api_key=fe30ba97956d6c5afafc72b84941712d"
```

**Key Fields in Each Episode Object:**
* `episode_number`: Integer (e.g. `1`)
* `name`: Episode title (e.g. `"Chapter One: The Vanishing of Will Byers"`)
* `overview`: High-definition episode synopsis
* `still_path`: Relative image path for 16:9 episode still (e.g. `"/6jSA6JpxNDV63aDXpmsUFCjCINb.jpg"`)
* `runtime`: Runtime in minutes (e.g. `48`)
* `vote_average`: User rating for the specific episode (e.g. `8.5`)
* `air_date`: Original broadcast date (`"2016-07-15"`)

### 6.2 Episode Details: `GET /3/tv/{series_id}/season/{season_number}/episode/{episode_number}`
Returns deep episode metadata including guest stars, writers, directors, and crew.

### 6.3 Episode Stills: `GET /3/tv/{series_id}/season/{season_number}/episode/{episode_number}/images`
Returns multiple alternative 16:9 screenshot stills for high-resolution episode previews.

---

## 7. Universal Search & Autocomplete Engine

### 7.1 Multi-Search (Recommended for CinemaVerse Live Search)
Searches across movies, TV series, and actors simultaneously with a single query.

* **Endpoint:** `GET /3/search/multi`
* **Required Parameters:** `query`
* **Optional Parameters:** `include_adult=false`, `language=en-US`, `page=1`

```bash
curl -X GET "https://api.tmdb.org/3/search/multi?query=oppenheimer&include_adult=false&api_key=fe30ba97956d6c5afafc72b84941712d"
```

**Response Handling:**
Inspect the `media_type` field:
* `movie`: Contains `title`, `release_date`, `poster_path`, `backdrop_path`.
* `tv`: Contains `name`, `first_air_date`, `poster_path`, `backdrop_path`.
* `person`: Contains `name`, `profile_path`, `known_for` (array of top credits).

### 7.2 Dedicated Search Endpoints
* **Movies:** `GET /3/search/movie?query={q}&primary_release_year={year}`
* **TV Shows:** `GET /3/search/tv?query={q}&first_air_date_year={year}`
* **People:** `GET /3/search/person?query={q}`
* **Keywords:** `GET /3/search/keyword?query={q}`
* **Collections:** `GET /3/search/collection?query={q}`

---

## 8. Parametric Discover Engine

The Discover Engine allows constructing custom dynamic catalogs, platform-specific rows, and genre filters using over 30 parametric criteria.

### 8.1 Discover Movies: `GET /3/discover/movie`
### 8.2 Discover TV Series: `GET /3/discover/tv`

### Essential Filter Parameters:

| Parameter | Type | Example | Purpose in CinemaVerse |
| :--- | :--- | :--- | :--- |
| `with_watch_providers` | string (IDs) | `8` (Netflix), `119` (Prime) | Filter titles exclusively streaming on specific OTTs |
| `watch_region` | string (ISO-3166-1) | `IN` | Restricts streaming availability to India |
| `with_genres` | string (comma/pipe) | `28,878` (Action AND Sci-Fi) | Multi-genre filtering |
| `without_genres` | string | `16` (Exclude Animation) | Genre exclusion |
| `sort_by` | enum | `popularity.desc`, `vote_average.desc` | Sorting options |
| `vote_average.gte` | float | `7.5` | Quality filter (only top-rated content) |
| `vote_count.gte` | integer | `300` | Avoids niche titles with only 1 or 2 votes |
| `with_original_language` | string (ISO-639-1) | `hi` (Hindi), `ja` (Anime), `ko` (K-Drama) | Regional catalog categorization |
| `primary_release_year` | integer | `2024` | Release year filtering |

#### Example: Discover Netflix India Blockbusters
```bash
curl -X GET "https://api.tmdb.org/3/discover/movie?with_watch_providers=8&watch_region=IN&sort_by=popularity.desc&vote_count.gte=200&api_key=fe30ba97956d6c5afafc72b84941712d"
```

---

## 9. Trending & Curated Top Lists

### 9.1 Trending Engine: `GET /3/trending/{media_type}/{time_window}`
* **`media_type`:** `all`, `movie`, `tv`, `person`
* **`time_window`:** `day` (24h velocity), `week` (7-day trend)

#### Example: Trending Across All Media This Week
```bash
curl -X GET "https://api.tmdb.org/3/trending/all/week?api_key=fe30ba97956d6c5afafc72b84941712d"
```

---

## 10. Collections & Franchises Engine

* **Collection Search:** `GET /3/search/collection?query={franchise_name}`
* **Collection Details:** `GET /3/collection/{collection_id}`
  * Returns collection poster, backdrop, overview, and the complete chronological list of movies in the franchise (`parts` array).
* **Collection Images:** `GET /3/collection/{collection_id}/images`

---

## 11. Watch Providers & Indian OTT Ecosystem

TMDb integrates JustWatch data to track where titles are streaming. In CinemaVerse Pro, this verifies that titles categorized under OTT hubs (Netflix, Hotstar, Prime, etc.) are currently streaming in India.

### 11.1 Key Indian Provider IDs (`watch_region=IN`)
* **Netflix:** `8`
* **Amazon Prime Video:** `119`
* **JioHotstar (Disney+ Hotstar):** `2336` (and `122`)
* **Apple TV / Apple TV+:** `350`
* **Sony Liv:** `237`
* **Zee5:** `232`
* **JioCinema:** `220`
* **Crunchyroll (Anime):** `283`
* **Sun Nxt:** `309`

### 11.2 Providers Directory: `GET /3/watch/providers/movie?watch_region=IN`
Returns all active streaming services, their logos, and priority order in the Indian market.

---

## 12. People, Cast, & Crew Filmographies

* **Person Details:** `GET /3/person/{person_id}`  
  Biography, birthday, place of birth, and profile headshot.
* **Combined Credits:** `GET /3/person/{person_id}/combined_credits`  
  Complete filmography spanning both movies and TV series with character names.
* **Person External IDs:** `GET /3/person/{person_id}/external_ids`  
  IMDb ID, Instagram, Twitter, and Wikipedia.

---

## 13. Interactive User Personalization

* **Guest Sessions:** `GET /3/authentication/guest_session/new`  
  Allows instant, zero-login rating submissions.
* **Rate Movie:** `POST /3/movie/{movie_id}/rating?guest_session_id={id}` with body `{ "value": 8.5 }`.
* **Rate TV Episode:** `POST /3/tv/{series_id}/season/{s}/episode/{ep}/rating?guest_session_id={id}` with body `{ "value": 9.0 }`.
* **User Watchlist:** `POST /3/account/{account_id}/watchlist?session_id={id}` with body `{ "media_type": "movie", "media_id": 550, "watchlist": true }`.
* **User Favorites:** `POST /3/account/{account_id}/favorite?session_id={id}` with body `{ "media_type": "movie", "media_id": 550, "favorite": true }`.

---

## 14. Delta-Sync & Changelog Auditing Engine

* **Movie Changes:** `GET /3/movie/changes?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
* **TV Changes:** `GET /3/tv/changes?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
* **Person Changes:** `GET /3/person/changes?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
* **Granular Item Audit:** `GET /3/movie/{movie_id}/changes`  
  Enables updating local catalog caches incrementally without downloading the entire catalog.

---

## 15. System Taxonomies

### Movie Genres (`GET /3/genre/movie/list`):
`28` (Action), `12` (Adventure), `16` (Animation), `35` (Comedy), `80` (Crime), `99` (Documentary), `18` (Drama), `10751` (Family), `14` (Fantasy), `36` (History), `27` (Horror), `10402` (Music), `9648` (Mystery), `10749` (Romance), `878` (Sci-Fi), `10770` (TV Movie), `53` (Thriller), `10752` (War), `37` (Western).

### TV Genres (`GET /3/genre/tv/list`):
`10759` (Action & Adventure), `16` (Animation), `35` (Comedy), `80` (Crime), `99` (Documentary), `18` (Drama), `10751` (Family), `10762` (Kids), `10763` (News), `10764` (Reality), `10765` (Sci-Fi & Fantasy), `10766` (Soap), `10767` (Talk), `10768` (War & Politics), `37` (Western).

---

## 16. Image CDN Delivery & Anti-Blocking Proxy Architecture

### 16.1 Official TMDb Image Dimensions
From `GET /3/configuration`:

| Asset Type | Standard Dimensions | Recommended CinemaVerse Usage |
| :--- | :--- | :--- |
| **Posters** | `w92`, `w154`, `w185`, `w342`, `w500`, `w780`, `original` | `w500` (Cards), `w780` (Modal Poster) |
| **Backdrops** | `w300`, `w780`, `w1280`, `original` | `w1280` (Hero Banner & Details Modal) |
| **Logos** | `w45`, `w92`, `w154`, `w185`, `w300`, `w500`, `original` | `w500` (Transparent title typography) |
| **Episode Stills** | `w92`, `w185`, `w300`, `original` | `w500` (Episode thumbnail previews) |
| **Cast Profiles** | `w45`, `w185`, `h632`, `original` | `w185` (Modal Cast avatar chips) |

### 16.2 Anti-ISP Blocking Architecture (Zero Dark Sheets / Zero Broken Images)
> [!IMPORTANT]
> Major Indian ISPs (Reliance Jio, Bharti Airtel, Vodafone Idea) frequently intercept and block requests to external CDNs (`image.tmdb.org`, `images.metahub.space`) at the DNS and SNI layer. When the browser attempts to fetch these directly, images fail silently, resulting in dark fallback cards or blank banners.
> 
> **The Solution in CinemaVerse Pro:**
> All TMDb image URLs are proxied through the local server:
> `/api/tmdb-image/{size}/{file_path}`
> The Node.js backend streams the image buffers directly with HTTP 200 and long-term caching (`Cache-Control: public, max-age=604800, immutable`), ensuring unblockable 100% visual uptime on Jio/Airtel connections.

---

## 17. CinemaVerse Pro Feature Mapping Matrix

| CinemaVerse Pro UI Component | TMDb API Endpoint & Parameters | Injected Metadata |
| :--- | :--- | :--- |
| **Hero Billboard Carousel** | `GET /3/trending/all/week`<br>`GET /3/tv/{id}?append_to_response=images` | `backdrop_path` (w1280), transparent title SVG/PNG `logo_path`, `tagline`, live rating |
| **Netflix Details Modal** | `GET /3/{type}/{id}?append_to_response=credits,videos,images,release_dates,watch/providers,external_ids` | Official 4K trailer (`videos`), actor profile photos & roles (`credits.cast`), Indian maturity rating (`release_dates` / `content_ratings`), tagline |
| **TV Episode Picker** | `GET /3/tv/{id}/season/{season_number}` | Real 16:9 screenshot still (`still_path`), official episode name, description, duration |
| **Live Search & Autocomplete** | `GET /3/search/multi?query={q}&include_adult=false` | Instant multi-type matching (Movies, TV Shows, Actors) with poster previews |
| **Multi-Server Playback Engine** | `GET /3/find/{imdbId}?external_source=imdb_id`<br>`GET /3/{type}/{tmdbId}/external_ids` | Real-time bidirectional conversion of TMDb ↔ IMDb IDs so Servers 1–10 receive valid stream targets |
| **OTT Hub Filters (14 Platforms)** | `GET /3/discover/{type}?with_watch_providers={id}&watch_region=IN` | Verified Indian streaming library for Netflix (`8`), Prime (`119`), JioHotstar (`2336`), SonyLiv (`237`), Zee5 (`232`) |

---
*CinemaVerse Pro • Architecture Specification Document • Powered by TMDb API v3*
