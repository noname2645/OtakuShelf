import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import styles from "../Stylesheets/advancedsearch.module.css";
import Modal from "./modal.jsx";
import { Header } from '../components/header.jsx';
import { Link } from 'react-router-dom';
import "../Stylesheets/home.css";

// Create a clean axios instance for AniList without auth headers
const anilistClient = axios.create({
  baseURL: "https://graphql.anilist.co",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json"
  },
  withCredentials: false
});

// Ensure no auth headers are sent to AniList
delete anilistClient.defaults.headers.common["Authorization"];

// Memoized constants to prevent recreation - filtered for appropriate content
const ANIME_GENRES = [
  "Action",
  "Adventure",
  "Avant Garde",
  "Award Winning",
  "Boys Love",
  "Comedy",
  "Drama",
  "Fantasy",
  "Girls Love",
  "Gourmet",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Slice of Life",
  "Sports",
  "Supernatural",
  "Suspense",
  "Thriller",
];

const ANIME_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

const FILTER_OPTIONS = {
  type: ["TV", "MOVIE", "OVA", "ONA", "SPECIAL"],
  status: ["FINISHED", "RELEASING", "TBA"]
};

// Simple working GraphQL query
// Enhanced GraphQL query with related anime and trailer
const ANIME_SEARCH_QUERY = `
  query AdvancedSearch(
    $page: Int = 1,
    $perPage: Int = 20,
    $search: String,
    $format_in: [MediaFormat],
    $status_in: [MediaStatus],
    $averageScore_greater: Int,
    $season: MediaSeason,
    $seasonYear: Int,
    $genre_in: [String]
  ) {
    Page(page: $page, perPage: $perPage) {
      pageInfo {
        total
        currentPage
        lastPage
        hasNextPage
      }
      media(
        type: ANIME,
        isAdult: false,
        search: $search,
        format_in: $format_in,
        status_in: $status_in,
        averageScore_greater: $averageScore_greater,
        season: $season,
        seasonYear: $seasonYear,
        genre_in: $genre_in,
        sort: POPULARITY_DESC
      ) {
        id
        idMal
        title {
          romaji
          english
          native
          userPreferred
        }
        coverImage {
          large
          extraLarge
          medium
          color
        }
        bannerImage
        description
        episodes
        duration
        format
        status
        genres
        averageScore
        meanScore
        season
        seasonYear
        source
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        # Add trailer data
        trailer {
          id
          site
          thumbnail
        }
        # Add studio data
        studios {
          nodes {
            name
          }
        }
        # Add relations data
        relations {
          edges {
            relationType
            node {
              id
              idMal
              title {
                romaji
                english
                native
                userPreferred
              }
              coverImage {
                large
                extraLarge
                medium
                color
              }
              format
              status
              episodes
              averageScore
            }
          }
        }
      }
    }
  }
`;

function AdvancedSearch() {
  const [searchText, setSearchText] = useState("");

  // Simplified filter state
  const [filterOptions, setFilterOptions] = useState({
    type: [],
    status: ["RELEASING", "FINISHED"],
    minimumScore: 0,
    season: "",
    seasonYear: "",
    genres: [],
  });

  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOpenDropdown, setCurrentOpenDropdown] = useState(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalResultsCount, setTotalResultsCount] = useState(0);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAnimeForModal, setSelectedAnimeForModal] = useState(null);

  // Memoized navigation helper
  const getActivePage = useCallback(() => {
    const path = window.location.pathname;
    if (path === '/home' || path === '/') return 'home';
    if (path === '/list') return 'list';
    if (path === '/advance') return 'search';
    if (path === '/ai') return 'AI';
    return '';
  }, []);

  // Optimized dropdown toggle
  const toggleDropdown = useCallback((dropdownName) => {
    setCurrentOpenDropdown(prev => prev === dropdownName ? null : dropdownName);
  }, []);

  // Optimized checkbox handler
  const handleCheckboxChange = useCallback((value, filterField) => {
    setFilterOptions(prev => {
      const currentList = prev[filterField];
      const newList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value];

      return { ...prev, [filterField]: newList };
    });
  }, []);

  // Optimized input handler
  const handleInputChange = useCallback((event) => {
    const { name, value } = event.target;
    setFilterOptions(prev => ({
      ...prev,
      [name]: name === "minimumScore" ? parseFloat(value) : value
    }));
  }, []);

  // Simplified anime data cleanup
  const cleanUpAnimeData = useCallback((rawAnime) => {
    if (!rawAnime) {
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: "Unknown Title",
        coverImage: {
          large: '/placeholder-cover.png',
          extraLarge: '/placeholder-cover.png',
          medium: '/placeholder-cover.png',
          color: null
        },
        bannerImage: '/placeholder-banner.png',
        description: "No description available",
        episodes: 0,
        duration: 0,
        format: "Unknown",
        status: "Unknown",
        genres: [],
        startDate: "TBA",
        endDate: "TBA",
        season: "Unknown",
        year: "Unknown",
        score: "N/A",
        averageScore: "N/A",
        source: "Unknown",
        trailer: null,
        studios: { nodes: [] },
        relations: { edges: [] },
        _originalData: {}
      };
    }

    // Safely extract title
    let bestTitle = "Untitled";
    if (typeof rawAnime.title === "string") {
      bestTitle = rawAnime.title;
    } else if (rawAnime.title && typeof rawAnime.title === "object") {
      bestTitle = rawAnime.title.userPreferred ||
        rawAnime.title.romaji ||
        rawAnime.title.english ||
        rawAnime.title.native ||
        "Untitled";
    }

    // Safely extract dates
    const startDate = rawAnime.startDate ?
      `${rawAnime.startDate.year || "?"}-${rawAnime.startDate.month || "?"}-${rawAnime.startDate.day || "?"}` :
      "TBA";

    const endDate = rawAnime.endDate ?
      `${rawAnime.endDate.year || "?"}-${rawAnime.endDate.month || "?"}-${rawAnime.endDate.day || "?"}` :
      "TBA";

    // Clean trailer data
    const trailer = rawAnime.trailer ? {
      id: rawAnime.trailer.id || null,
      site: rawAnime.trailer.site || null,
      thumbnail: rawAnime.trailer.thumbnail || null
    } : null;

    // Clean studios data
    const studios = {
      nodes: rawAnime.studios?.nodes?.map(node => ({
        name: node.name || "Unknown Studio"
      })) || []
    };

    // Clean relations data to prevent object rendering issues
    const relations = {
      edges: rawAnime.relations?.edges?.map(edge => ({
        relationType: edge.relationType || "RELATED",
        node: edge.node ? {
          id: edge.node.id,
          idMal: edge.node.idMal,
          title: typeof edge.node.title === 'string'
            ? edge.node.title
            : {
              romaji: edge.node.title?.romaji || "",
              english: edge.node.title?.english || "",
              native: edge.node.title?.native || "",
              userPreferred: edge.node.title?.userPreferred || ""
            },
          coverImage: edge.node.coverImage || {
            large: '/placeholder-cover.png',
            extraLarge: '/placeholder-cover.png',
            medium: '/placeholder-cover.png',
            color: null
          },
          format: edge.node.format || "Unknown",
          status: edge.node.status || "Unknown",
          episodes: edge.node.episodes || 0,
          averageScore: edge.node.averageScore || null
        } : null
      })).filter(edge => edge.node !== null) || []
    };

    return {
      id: rawAnime.id || Math.random().toString(36).substr(2, 9),
      idMal: rawAnime.idMal || undefined,
      title: bestTitle,
      coverImage: {
        large: rawAnime.coverImage?.large || '/placeholder-cover.png',
        extraLarge: rawAnime.coverImage?.extraLarge || '/placeholder-cover.png',
        medium: rawAnime.coverImage?.medium || '/placeholder-cover.png',
        color: rawAnime.coverImage?.color || null
      },
      bannerImage: rawAnime.bannerImage || '/placeholder-banner.png',
      description: rawAnime.description || "No description available",
      episodes: rawAnime.episodes || 0,
      duration: rawAnime.duration || 0,
      format: rawAnime.format || "Unknown",
      status: rawAnime.status || "Unknown",
      genres: Array.isArray(rawAnime.genres) ? rawAnime.genres : [],
      startDate: startDate,
      endDate: endDate,
      season: rawAnime.season || "Unknown",
      year: rawAnime.seasonYear || "Unknown",
      score: rawAnime.averageScore ?? rawAnime.meanScore ?? "N/A",
      seasonYear: rawAnime.seasonYear || "Unknown",
      averageScore: rawAnime.averageScore ?? rawAnime.meanScore ?? "N/A",
      source: rawAnime.source || "Unknown",
      trailer: trailer,
      studios: studios,
      relations: relations,
      _originalData: rawAnime
    };
  }, []);
  // Fixed search function using clean anilistClient
  const searchForAnime = useCallback(async (pageNumber = 1, isNewSearch = false, searchQuery = "") => {
    console.log("=== SEARCH START ===");
    console.log("Page:", pageNumber, "New search:", isNewSearch);

    if (isNewSearch) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // Build variables object
      const variables = {
        page: pageNumber,
        perPage: 20
      };

      // Add search if present
      if (searchQuery && searchQuery.trim().length > 0) {
        variables.search = searchQuery.trim();
      }

      // Add filters only if they have values
      if (filterOptions.type && filterOptions.type.length > 0) {
        variables.format_in = filterOptions.type;
      }

      if (filterOptions.status && filterOptions.status.length > 0) {
        variables.status_in = filterOptions.status;
      }

      // Handle minimum score
      if (filterOptions.minimumScore > 0) {
        variables.averageScore_greater = Math.floor(filterOptions.minimumScore * 10);
      }

      // Handle season
      if (filterOptions.season) {
        variables.season = filterOptions.season;
      }

      // Handle year
      if (filterOptions.seasonYear && filterOptions.seasonYear.trim() !== "") {
        const year = parseInt(filterOptions.seasonYear);
        if (!isNaN(year) && year > 1900) {
          variables.seasonYear = year;
        }
      }

      // Handle genres
      if (filterOptions.genres && filterOptions.genres.length > 0) {
        variables.genre_in = filterOptions.genres;
      }

      // Remove undefined variables
      Object.keys(variables).forEach(key => {
        if (variables[key] === undefined ||
          variables[key] === null ||
          (Array.isArray(variables[key]) && variables[key].length === 0)) {
          delete variables[key];
        }
      });

      console.log("API Variables:", JSON.stringify(variables, null, 2));

      // Use the clean anilistClient (no auth headers)
      const response = await anilistClient.post("/", {
        query: ANIME_SEARCH_QUERY,
        variables
      });

      console.log("=== API RESPONSE ===");
      console.log("Response status:", response.status);

      if (response.data.errors) {
        console.error("GraphQL Errors:", response.data.errors);
        throw new Error(response.data.errors[0]?.message || "GraphQL error");
      }

      if (!response.data?.data?.Page) {
        console.error("Invalid response structure:", response.data);
        throw new Error("Invalid API response structure");
      }

      const responseData = response.data.data.Page;
      const cleanedAnimeList = responseData.media.map(cleanUpAnimeData);

      console.log("Cleaned anime list length:", cleanedAnimeList.length);
      if (cleanedAnimeList.length > 0) {
        console.log("First anime:", cleanedAnimeList[0].title);
      }

      setHasMorePages(responseData.pageInfo.hasNextPage);
      setTotalResultsCount(responseData.pageInfo.total);

      if (isNewSearch) {
        setSearchResults(cleanedAnimeList);
        setCurrentPageNumber(1);
      } else {
        setSearchResults(prev => {
          const existingIds = new Set(prev.map(anime => anime.id));
          const newAnime = cleanedAnimeList.filter(anime => !existingIds.has(anime.id));
          return [...prev, ...newAnime];
        });
        setCurrentPageNumber(pageNumber);
      }

    } catch (error) {
      console.error("=== SEARCH ERROR ===");
      console.error("Error message:", error.message);

      if (error.response) {
        console.error("Error response data:", error.response.data);
        console.error("Error status:", error.response.status);

        if (error.response.data?.errors) {
          console.error("GraphQL errors:", JSON.stringify(error.response.data.errors, null, 2));
        }
      }

      if (isNewSearch) {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
      setCurrentOpenDropdown(null);
    }
  }, [filterOptions, cleanUpAnimeData]);

  // Debounced search effect
  const hasActiveFilters = useMemo(() => {
    return filterOptions.genres.length > 0 ||
      filterOptions.type.length > 0 ||
      filterOptions.season ||
      filterOptions.minimumScore > 0;
  }, [filterOptions]);

  // Add this useEffect to trigger staggered animations
  useEffect(() => {
    if (searchResults.length > 0) {
      const timer = setTimeout(() => {
        const cards = document.querySelectorAll(`.${styles.animeCard}`);
        cards.forEach((card, index) => {
          setTimeout(() => {
            card.classList.add(styles.animateIn);
          }, index * 50); // 50ms delay between each card
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [searchResults, styles.animeCard]);

  useEffect(() => {
    // Allow first fetch on mount
    if (!hasFetchedOnce) {
      setHasFetchedOnce(true);
      searchForAnime(1, true);
      return;
    }

    // After first fetch, require intent
    if (!searchText && !hasActiveFilters) return;

    const t = setTimeout(() => {
      searchForAnime(1, true, searchText.trim() || undefined);
    }, 300);

    return () => clearTimeout(t);
  }, [searchText, hasActiveFilters, hasFetchedOnce, searchForAnime]);

  // Optimized infinite scroll
  const handleScrollToBottom = useCallback(() => {
    if (isLoadingMore || !hasMorePages) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    if (scrollTop + clientHeight >= scrollHeight - 200) {
      searchForAnime(currentPageNumber + 1, false, searchText.trim());
    }
  }, [isLoadingMore, hasMorePages, currentPageNumber, searchText, searchForAnime]);

  useEffect(() => {
    window.addEventListener('scroll', handleScrollToBottom, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollToBottom);
  }, [handleScrollToBottom]);

  // Modal handlers
  const showAnimeDetails = useCallback((anime) => {
    setSelectedAnimeForModal(anime);
    setIsModalVisible(true);
  }, []);

  const hideAnimeDetails = useCallback(() => {
    setSelectedAnimeForModal(null);
    setIsModalVisible(false);
  }, []);

  // Reset filters
  const clearAllFilters = useCallback(() => {
    setFilterOptions({
      type: [],
      status: ["FINISHED", "RELEASING"],
      minimumScore: 0,
      season: "",
      seasonYear: "",
      genres: [],
    });
    setSearchResults([]);
    setCurrentPageNumber(1);
    setHasMorePages(true);
    setTotalResultsCount(0);
    setSearchText("");
    setHasFetchedOnce(false);
  }, []);

  // Memoized filter count
  const getFilterCount = useCallback((filterArray) => {
    return filterArray.length > 0 ? `(${filterArray.length})` : "";
  }, []);

  // Render dropdown options
  const renderCheckboxOptions = useCallback((options, filterKey, gridClass = "optionsGrid") => (
    <div className={styles.dropdownContent}>
      <div className={styles[gridClass]}>
        {options.map(option => (
          <label key={option} className={styles.checkboxLabel}>
            <input
              type="checkbox"
              value={option}
              checked={filterOptions[filterKey].includes(option)}
              onChange={() => handleCheckboxChange(option, filterKey)}
            />
            <span>{option}</span>
          </label>
        ))}
      </div>
    </div>
  ), [filterOptions, handleCheckboxChange]);

  return (
    <>
      <Header showSearch={true} onSearchChange={(value) => setSearchText(value)} />

      {/* Bottom Navigation */}
      <div className="bottom-button-bar">
        <Link
          to="/home"
          title="home"
          className={`nav-label ${getActivePage() === 'home' ? 'active' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path fill="inherit" d="M261.56 101.28a8 8 0 0 0-11.06 0L66.4 277.15a8 8 0 0 0-2.47 5.79L63.9 448a32 32 0 0 0 32 32H192a16 16 0 0 0 16-16V328a8 8 0 0 1 8-8h80a8 8 0 0 1 8 8v136a16 16 0 0 0 16 16h96.06a32 32 0 0 0 32-32V282.94a8 8 0 0 0-2.47-5.79Z" />
            <path fill="inherit" d="m490.91 244.15l-74.8-71.56V64a16 16 0 0 0-16-16h-48a16 16 0 0 0-16 16v32l-57.92-55.38C272.77 35.14 264.71 32 256 32c-8.68 0-16.72 3.14-22.14 8.63l-212.7 203.5c-6.22 6-7 15.87-1.34 22.37A16 16 0 0 0 43 267.56L250.5 69.28a8 8 0 0 1 11.06 0l207.52 198.28a16 16 0 0 0 22.59-.44c6.14-6.36 5.63-16.86-.76-22.97Z" />
          </svg>
        </Link>

        <Link
          to="/list"
          title="list"
          className={`nav-label ${getActivePage() === 'list' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="inherit"
            viewBox="0 0 18 20"
          >
            <path fill="inherit" d="M2 19.004h2.004V17H2v2.004ZM7 19h15v-2H7v2Zm-5-5.996h2.004V11H2v2.004ZM7 13h15v-2H7v2ZM2 7.004h2.004V5H2v2.004ZM7 7h15V5H7v2Z" />
          </svg>
        </Link>

        <Link
          to="/advance"
          title="search"
          className={`nav-label ${getActivePage() === 'search' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 26 26">
            <path fill="inherit"
              d="M10 .188A9.812 9.812 0 0 0 .187 10A9.812 9.812 0 0 0 10 19.813c2.29 0 4.393-.811 6.063-2.125l.875.875a1.845 1.845 0 0 0 .343 2.156l4.594 4.625c.713.714 1.88.714 2.594 0l.875-.875a1.84 1.84 0 0 0 0-2.594l-4.625-4.594a1.824 1.824 0 0 0-2.157-.312l-.875-.875A9.812 9.812 0 0 0 10 .188zM10 2a8 8 0 1 1 0 16a8 8 0 0 1 0-16zM4.937 7.469a5.446 5.446 0 0 0-.812 2.875a5.46 5.46 0 0 0 5.469 5.469a5.516 5.516 0 0 0 3.156-1a7.166 7.166 0 0 1-.75.03a7.045 7.045 0 0 1-7.063-7.062c0-.104-.005-.208 0-.312z" />
          </svg>
        </Link>

        <Link
          to="/ai"
          title="AI"
          className={`nav-label ${getActivePage() === 'AI' ? 'active' : ''}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 512 512">
            <path fill="inherit" fillRule="evenodd" d="M384 128v256H128V128zm-148.25 64h-24.932l-47.334 128h22.493l8.936-25.023h56.662L260.32 320h23.847zm88.344 64h-22.402v128h22.402zm-101 21.475l22.315 63.858h-44.274zM405.335 320H448v42.667h-42.667zm-256 85.333H192V448h-42.667zm85.333 0h42.666V448h-42.666zM149.333 64H192v42.667h-42.667zM320 405.333h42.667V448H320zM234.667 64h42.666v42.667h-42.666zM320 64h42.667v42.667H320zm85.333 170.667H448v42.666h-42.667zM64 320h42.667v42.667H64zm341.333-170.667H448V192h-42.667zM64 234.667h42.667v42.666H64zm0-85.334h42.667V192H64z" />
          </svg>
        </Link>
      </div>

      <div className={styles.advancedSearchContainer}>
        {/* Optimized Filter Dropdowns */}
        <div className={styles.dropdownFilters}>
          {/* Type Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "type" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("type")}
            >
              Type {getFilterCount(filterOptions.type)}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              {renderCheckboxOptions(FILTER_OPTIONS.type, "type")}
            </div>
          </div>

          {/* Status Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "status" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("status")}
            >
              Status {getFilterCount(filterOptions.status)}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              {renderCheckboxOptions(FILTER_OPTIONS.status, "status")}
            </div>
          </div>

          {/* Score Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "score" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("score")}
            >
              Score ({filterOptions.minimumScore})
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.scoreRange}>
                <div className={styles.rangeInput}>
                  <label>Min Score: {filterOptions.minimumScore}</label>
                  <input
                    type="range"
                    name="minimumScore"
                    min="0"
                    max="10"
                    step="0.5"
                    value={filterOptions.minimumScore}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Genres Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "genres" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("genres")}
            >
              Genres {getFilterCount(filterOptions.genres)}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={`${styles.dropdownMenu} ${styles.genresMenu}`}>
              {renderCheckboxOptions(ANIME_GENRES, "genres", "genresGrid")}
            </div>
          </div>

          {/* Season Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "season" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("season")}
            >
              Season {filterOptions.season ? `(${filterOptions.season})` : ""}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                <div className={styles.seasonGrid}>
                  {ANIME_SEASONS.map(season => (
                    <label key={season} className={styles.checkboxLabel}>
                      <input
                        type="radio"
                        name="season"
                        value={season}
                        checked={filterOptions.season === season}
                        onChange={handleInputChange}
                      />
                      <span>{season}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Year Filter */}
          <div className={`${styles.dropdown} ${currentOpenDropdown === "seasonYear" ? styles.dropdownActive : ""}`}>
            <button
              className={styles.dropdownToggle}
              onClick={() => toggleDropdown("seasonYear")}
            >
              Year {filterOptions.seasonYear || ""}
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                <input
                  type="number"
                  name="seasonYear"
                  placeholder="Enter year (e.g., 2024)"
                  value={filterOptions.seasonYear}
                  onChange={handleInputChange}
                  className={styles.textInput}
                  min="1960"
                  max={new Date().getFullYear() + 5}
                />
              </div>
            </div>
          </div>

          {/* Reset Button */}
          <button className={styles.resetBtn} onClick={clearAllFilters}>
            Reset Filters
          </button>
        </div>

        {/* Search Results Section */}
        <div className={styles.resultsSection}>
          {isSearching && <div className={styles.loader}></div>}

          {!isSearching && searchResults.length > 0 && (
            <div className={styles.resultsCount}>
              Your query matched with {totalResultsCount} results
            </div>
          )}

          {/* Optimized Anime Grid */}
          <div className={styles.animeGrid}>
            {searchResults.map(anime => {
              const imageUrl = anime.coverImage?.extraLarge ||
                anime.coverImage?.large ||
                "/placeholder-anime.jpg";

              return (
                <div
                  key={anime.id}
                  className={styles.animeCard}
                  onClick={() => showAnimeDetails(anime)}
                >
                  <div className={styles.homeCardImage2}>
                    <img
                      src={imageUrl}
                      alt={anime.title || "Anime"}
                      loading="lazy"
                      onError={(e) => {
                        console.log("Image failed to load:", imageUrl);
                        e.currentTarget.src = "/placeholder-anime.jpg";
                      }}
                    />
                    <div className={styles.cardTitleBottom}>
                      <h3>{anime.title || "Untitled Anime"}</h3>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loading States */}
          {isLoadingMore && (
            <div className={styles.loadingMore}>
              <div className={styles.loader}></div>
            </div>
          )}

          {!isSearching && !hasMorePages && searchResults.length > 0 && (
            <div className={styles.endOfResults}>
              <p>End of results</p>
            </div>
          )}

          {!isSearching && searchResults.length === 0 && (
            <div className={styles.noResults}>
              <p>No results found. Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>

        {/* Modal for Anime Details */}
        <Modal
          isOpen={isModalVisible}
          onClose={hideAnimeDetails}
          anime={selectedAnimeForModal}
          onOpenAnime={setSelectedAnimeForModal}
        />
      </div>
    </>
  );
}

export default AdvancedSearch;