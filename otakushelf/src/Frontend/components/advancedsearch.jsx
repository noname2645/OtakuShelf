import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import styles from "../Stylesheets/advancedsearch.module.css";
import Modal from "./modal.jsx";
import Lenis from '@studio-freight/lenis'
import { Header } from '../components/header.jsx';
import { Link } from 'react-router-dom';
import "../Stylesheets/home.css";

// List of all available anime genres
const ANIME_GENRES = [
  "Action", "Adventure", "Avant Garde", "Award Winning", "Boys Love",
  "Comedy", "Drama", "Ecchi", "Erotica", "Fantasy", "Girls Love", "Gourmet",
  "Hentai", "Horror", "Mystery", "Romance", "Sci-Fi", "Slice of Life",
  "Sports", "Supernatural", "Suspense"
];

// List of anime seasons
const ANIME_SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];

function AdvancedSearch() {
  const [searchText, setSearchText] = useState("");
  
  // All the filter options
  const [filterOptions, setFilterOptions] = useState({
    type: [],
    status: ["RELEASING", "FINISHED"], 
    minimumScore: 7, 
    season: "", 
    seasonYear: "2025", 
    startYear: "", 
    startMonth: "", 
    startDay: "",
    endYear: "", 
    endMonth: "", 
    endDay: "",
    genres: [], 
  });

  // Search results and loading states
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [currentOpenDropdown, setCurrentOpenDropdown] = useState(null);

  // Page navigation for loading more results
  const [currentPageNumber, setCurrentPageNumber] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [totalResultsCount, setTotalResultsCount] = useState(0);

  // Modal popup for anime details
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAnimeForModal, setSelectedAnimeForModal] = useState(null);

  const smoothScrollRef = useRef(null);

  // Setup smooth scrolling when component loads
  useEffect(() => {
    const smoothScroll = new Lenis({
      lerp: 0.09,
      smooth: true,
      infinite: false,
    });

    smoothScrollRef.current = smoothScroll;

    function animateScroll(time) {
      smoothScroll.raf(time);
      requestAnimationFrame(animateScroll);
    }

    const animationRequestId = requestAnimationFrame(animateScroll);

    // Cleanup when component unmounts
    return () => {
      cancelAnimationFrame(animationRequestId);
      smoothScroll.destroy();
      smoothScrollRef.current = null;
    };
  }, []);

  // Function to show/hide dropdown menus
  const showOrHideDropdown = (dropdownName) => {
    if (currentOpenDropdown === dropdownName) {
      setCurrentOpenDropdown(null); // Close if already open
    } else {
      setCurrentOpenDropdown(dropdownName); // Open this dropdown
    }
  };

  // Function to handle checkbox selections in filters
  const handleCheckboxClick = (event, filterField) => {
    const selectedValue = event.target.value;
    
    setFilterOptions(previousFilters => {
      const currentList = previousFilters[filterField];
      let newList;
      
      if (currentList.includes(selectedValue)) {
        // Remove if already selected
        newList = currentList.filter(item => item !== selectedValue);
      } else {
        // Add if not selected
        newList = [...currentList, selectedValue];
      }
      
      return { ...previousFilters, [filterField]: newList };
    });
  };

  // Function to handle text inputs and dropdowns
  const handleInputChange = (event) => {
    const inputName = event.target.name;
    const inputValue = event.target.value;
    
    setFilterOptions(previousFilters => ({ 
      ...previousFilters, 
      [inputName]: inputValue 
    }));
  };

  // Function to clean up anime data from API
  const cleanUpAnimeData = (rawAnime) => {
    // Get the best title available
    let bestTitle = "Untitled";
    if (typeof rawAnime.title === "string") {
      bestTitle = rawAnime.title;
    } else if (rawAnime.title) {
      bestTitle = rawAnime.title.romaji || 
                  rawAnime.title.english || 
                  rawAnime.title.native || 
                  "Untitled";
    }

    // Extract studio names from complex structure
    let studioNames = ["Unknown"];
    if (rawAnime.studios && rawAnime.studios.edges && rawAnime.studios.edges.length > 0) {
      studioNames = rawAnime.studios.edges.map(edge => edge.node.name);
    }

    // Make sure genres is always an array
    let genreList = [];
    if (rawAnime.genres && Array.isArray(rawAnime.genres)) {
      genreList = rawAnime.genres;
    }

    return {
      id: rawAnime.id,
      idMal: rawAnime.idMal || rawAnime.malId || undefined,
      title: bestTitle,
      coverImage: {
        large: rawAnime.coverImage?.large || '/placeholder-cover.png',
        extraLarge: rawAnime.coverImage?.extraLarge || '/placeholder-cover.png',
        medium: rawAnime.coverImage?.medium || '/placeholder-cover.png',
      },
      bannerImage: rawAnime.bannerImage || '/placeholder-banner.png',
      description: rawAnime.description || "No description available",
      episodes: rawAnime.episodes || 0,
      duration: rawAnime.duration || 0,
      format: rawAnime.format || "Unknown", 
      status: rawAnime.status || "Unknown", 
      genres: genreList, 
      studios: studioNames, 
      startDate: rawAnime.startDate || "TBA",
      endDate: rawAnime.endDate || "TBA",
      isAdult: rawAnime.isAdult || false,
      popularity: rawAnime.popularity || 0,
      trailer: rawAnime.trailer || null,
      season: rawAnime.season || "Unknown",
      year: rawAnime.seasonYear || rawAnime.year || "Unknown",
      score: rawAnime.averageScore ?? "N/A", 
      seasonYear: rawAnime.seasonYear || rawAnime.year || "Unknown",
      averageScore: rawAnime.averageScore ?? "N/A",
      _originalData: rawAnime
    };
  };

  // Main function to search for anime
  const searchForAnime = async (pageNumber = 1, isNewSearch = false, searchQuery = "") => {
    // Show loading spinner
    if (isNewSearch) {
      setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      // GraphQL query to fetch anime data
      const apiQuery = `
      query (
          $page: Int, 
          $perPage: Int, 
          $format_in: [MediaFormat], 
          $status_in: [MediaStatus], 
          $averageScore_greater: Int, 
          $season: MediaSeason,
          $seasonYear: Int, 
          $genre_in: [String], 
          $search: String
          ) {
          Page(page: $page, perPage: $perPage) {
          pageInfo { total currentPage lastPage hasNextPage perPage }
          media(
          type: ANIME, 
          format_in: $format_in, 
          status_in: $status_in,
          averageScore_greater: $averageScore_greater, 
          season: $season, 
          seasonYear: $seasonYear, 
          genre_in: $genre_in, 
          search: $search
          ) {
            id 
            idMal 
            title { english romaji native } 
            description
            coverImage { large extraLarge medium } 
            bannerImage 
            episodes 
            averageScore  
            status 
            genres
            season 
            seasonYear 
            format 
            duration 
            popularity 
            startDate { year month day } 
            endDate { year month day }
            studios { edges { node { name } } } 
            trailer { id site thumbnail } 
            isAdult 
            source
            }
          }
        }
      `;

      // Parameters to send with the query
      const queryParameters = {
        page: pageNumber,
        perPage: 20, // Get 20 results per page
        format_in: filterOptions.type.length ? filterOptions.type : null,
        status_in: filterOptions.status.length ? filterOptions.status : null,
        averageScore_greater: filterOptions.minimumScore * 10, // API uses 0-100 scale
        season: filterOptions.season || null,
        seasonYear: filterOptions.seasonYear ? parseInt(filterOptions.seasonYear) : null,
        genre_in: filterOptions.genres.length ? filterOptions.genres : null,
        search: searchQuery || null
      };

      // Remove null parameters
      const cleanParameters = {};
      for (const [key, value] of Object.entries(queryParameters)) {
        if (value !== null) {
          cleanParameters[key] = value;
        }
      }

      // Make API request
      const apiResponse = await axios.post(
        "https://graphql.anilist.co",
        { 
          query: apiQuery, 
          variables: cleanParameters 
        },
        { 
          headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json" 
          } 
        }
      );

      const responseData = apiResponse.data.data.Page;
      const cleanedAnimeList = responseData.media.map(cleanUpAnimeData);

      // Update page information
      setHasMorePages(responseData.pageInfo.hasNextPage);
      setTotalResultsCount(responseData.pageInfo.total);

      if (isNewSearch) {
        // Replace existing results with new search
        setSearchResults(cleanedAnimeList);
        setCurrentPageNumber(1);
      } else {
        // Add new results to existing ones (infinite scroll)
        setSearchResults(previousResults => {
          const existingAnimeIds = new Set(previousResults.map(anime => anime.id));
          const newAnimeOnly = cleanedAnimeList.filter(anime => !existingAnimeIds.has(anime.id));
          return [...previousResults, ...newAnimeOnly];
        });
        setCurrentPageNumber(pageNumber);
      }

    } catch (error) {
      console.error("Error fetching anime:", error.response?.data || error.message);
    } finally {
      // Hide loading spinners
      if (isNewSearch) {
        setIsSearching(false);
      } else {
        setIsLoadingMore(false);
      }
      setCurrentOpenDropdown(null);
    }
  };

  // Automatically search when user types or changes filters
  useEffect(() => {
    // Wait 400ms after user stops typing before searching
    const searchDelay = setTimeout(() => {
      searchForAnime(1, true, searchText.trim());
    }, 400);

    // Cancel previous timeout if user keeps typing
    return () => clearTimeout(searchDelay);
  }, [searchText, filterOptions]);

  // Handle infinite scroll - load more results when user scrolls to bottom
  const handleScrollToBottom = () => {
    if (isLoadingMore || !hasMorePages) return;
    
    const scrollPosition = document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    
    // If user is near the bottom (200px from bottom)
    if (scrollPosition + windowHeight >= documentHeight - 200) {
      searchForAnime(currentPageNumber + 1, false, searchText.trim());
    }
  };

  // Add scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScrollToBottom);
    return () => window.removeEventListener('scroll', handleScrollToBottom);
  }, [currentPageNumber, hasMorePages, isLoadingMore, filterOptions, searchText]);

  // Functions to handle modal popup
  const showAnimeDetails = (anime) => { 
    setSelectedAnimeForModal(anime); 
    setIsModalVisible(true); 
  };
  
  const hideAnimeDetails = () => { 
    setSelectedAnimeForModal(null); 
    setIsModalVisible(false); 
  };
  
  const showRelatedAnimeDetails = (relatedAnime) => {
    setSelectedAnimeForModal(relatedAnime);
  };

  // Function to clear all filters and start fresh
  const clearAllFilters = () => {
    setFilterOptions({
      type: [], 
      status: ["FINISHED", "RELEASING"], 
      minimumScore: 7,
      season: "", 
      seasonYear: "2025",
      genres: [],
    });
    setSearchResults([]);
    setCurrentPageNumber(1);
    setHasMorePages(true);
    setTotalResultsCount(0);
    setSearchText("");
  };

  // Helper function to show count in dropdown buttons
  const getFilterCount = (filterArray) => {
    return filterArray.length > 0 ? `(${filterArray.length})` : "";
  };

  return (
    <>
    <Header showSearch={false} />
    <div className={styles.advancedSearchContainer}>
      {/* Main Search Input */}
      <input
        type="text"
        placeholder="Search anime or apply filters"
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        className={styles.searchInput}
      />

      {/* Filter Dropdown Buttons */}
      <div className={styles.dropdownFilters}>
        
        {/* Type and Status Filters */}
        {[
          { 
            key: "type", 
            label: "Type", 
            options: ["TV", "MOVIE", "OVA", "ONA", "SPECIAL", "MUSIC"] 
          },
          { 
            key: "status", 
            label: "Status", 
            options: ["FINISHED", "RELEASING", "TBA"] 
          }
        ].map(filterDropdown => (
          <div key={filterDropdown.key} className={`${styles.dropdown} ${currentOpenDropdown === filterDropdown.key ? styles.dropdownActive : ""}`}>
            <button 
              className={styles.dropdownToggle} 
              onClick={() => showOrHideDropdown(filterDropdown.key)}
            >
              {filterDropdown.label} {getFilterCount(filterOptions[filterDropdown.key])} 
              <span className={styles.dropdownArrow}>▼</span>
            </button>
            <div className={styles.dropdownMenu}>
              <div className={styles.dropdownContent}>
                {filterDropdown.options.map(option => (
                  <label key={option} className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      value={option} 
                      checked={filterOptions[filterDropdown.key].includes(option)} 
                      onChange={event => handleCheckboxClick(event, filterDropdown.key)} 
                    />
                    <span className={styles.checkmark}></span>
                    {option}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Minimum Score Filter */}
        <div className={`${styles.dropdown} ${currentOpenDropdown === "score" ? styles.dropdownActive : ""}`}>
          <button 
            className={styles.dropdownToggle} 
            onClick={() => showOrHideDropdown("score")}
          >
            Score ({filterOptions.minimumScore}) 
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={`${styles.dropdownContent} ${styles.scoreRange}`}>
              <div className={styles.rangeInput}>
                <label>Min Score: {filterOptions.minimumScore}</label>
                <input
                  type="range"
                  name="minimumScore"
                  min="1"
                  max="10"
                  value={filterOptions.minimumScore}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Genre Filter */}
        <div className={`${styles.dropdown} ${currentOpenDropdown === "genres" ? styles.dropdownActive : ""}`}>
          <button 
            className={styles.dropdownToggle} 
            onClick={() => showOrHideDropdown("genres")}
          >
            Genres {getFilterCount(filterOptions.genres)} 
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={`${styles.dropdownMenu} ${styles.genresMenu}`}>
            <div className={styles.dropdownContent}>
              <div className={styles.genresGrid}>
                {ANIME_GENRES.map(genre => (
                  <label key={genre} className={styles.checkboxLabel}>
                    <input 
                      type="checkbox" 
                      value={genre} 
                      checked={filterOptions.genres.includes(genre)} 
                      onChange={event => handleCheckboxClick(event, "genres")} 
                    />
                    <span className={styles.checkmark}></span>
                    {genre}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Season Filter */}
        <div className={`${styles.dropdown} ${currentOpenDropdown === "season" ? styles.dropdownActive : ""}`}>
          <button 
            className={styles.dropdownToggle} 
            onClick={() => showOrHideDropdown("season")}
          >
            Season {filterOptions.season ? `(${filterOptions.season})` : ""} 
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownContent}>
              {ANIME_SEASONS.map(season => (
                <label key={season} className={styles.checkboxLabel}>
                  <input
                    type="radio"
                    name="season"
                    value={season}
                    checked={filterOptions.season === season}
                    onChange={handleInputChange}
                  />
                  <span className={styles.checkmark}></span>
                  {season}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Year Filter */}
        <div className={`${styles.dropdown} ${currentOpenDropdown === "seasonYear" ? styles.dropdownActive : ""}`}>
          <button 
            className={styles.dropdownToggle} 
            onClick={() => showOrHideDropdown("seasonYear")}
          >
            Year {filterOptions.seasonYear || ""} 
            <span className={styles.dropdownArrow}>▼</span>
          </button>
          <div className={styles.dropdownMenu}>
            <div className={styles.dropdownContent}>
              <input
                type="number"
                name="seasonYear"
                placeholder="Enter year"
                value={filterOptions.seasonYear}
                onChange={handleInputChange}
                className={styles.textInput}
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
            Showing {searchResults.length} of {totalResultsCount} results
          </div>
        )}
        
        {/* Anime Grid */}
        <div className={styles.animeGrid}>
          {searchResults.map(anime => (
            <div 
              key={anime.id} 
              className={styles.animeCard} 
              onClick={() => showAnimeDetails(anime)} 
              style={{ cursor: 'pointer' }}
            >
              <div className={styles.homeCardImage2}>
                <img
                  src={
                    anime.coverImage?.extraLarge ||
                    anime.coverImage?.large ||
                    anime.coverImage?.medium ||
                    anime.bannerImage ||
                    "/placeholder-anime.jpg"
                  }
                  alt={anime.title || "Anime"}
                  loading="lazy"
                  onError={event => (event.currentTarget.src = "/placeholder-anime.jpg")}
                />
                <div className={styles.cardTitleBottom}>
                  <h3>{anime.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Loading More Results */}
        {isLoadingMore && (
          <div className={styles.loadingMore}>
            <div className={styles.loadingSpinner}>Loading more...</div>
          </div>
        )}
        
        {/* End of Results Message */}
        {!isSearching && !hasMorePages && searchResults.length > 0 && (
          <div className={styles.endOfResults}>
            <p>End of results</p>
          </div>
        )}
        
        {/* No Results Message */}
        {!isSearching && searchResults.length === 0 && (
          <div className={styles.noResults}>
            <p>No results. Adjust filters or type to search.</p>
          </div>
        )}
      </div>

      {/* Modal Popup for Anime Details */}
      <Modal 
        isOpen={isModalVisible} 
        onClose={hideAnimeDetails} 
        anime={selectedAnimeForModal} 
        onOpenAnime={showRelatedAnimeDetails} 
      />
    </div>
    </>
  );
}

export default AdvancedSearch;