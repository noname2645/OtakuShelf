
import fetch from "node-fetch";

// Mock fetchAnimeContext
async function fetchAnimeContext(search) {
    const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        id
        title {
          romaji
          english
        }
        description
        genres
        averageScore
        popularity
        episodes
        status
        format
      }
    }
  `;

    try {
        const res = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                query,
                variables: { search }
            })
        });

        const json = await res.json();
        return json?.data?.Media || null;
    } catch (error) {
        console.error("AniList fetch error:", error);
        return null;
    }
}

async function extractAnimeRecommendations(response) {
    const recommendations = [];
    const animePattern = /\*\*([^*]+)\*\*/g;
    let match;
    const uniqueTitles = new Set();

    while ((match = animePattern.exec(response)) !== null) {
        const potentialAnime = match[1].trim();
        const lower = potentialAnime.toLowerCase();
        if (potentialAnime.length > 2 &&
            !lower.includes('score') &&
            !lower.includes('rating') &&
            !lower.includes('character') &&
            !lower.includes('genre') &&
            !lower.includes('note') &&
            !lower.includes('warning') &&
            !lower.includes('absolutely') &&
            !lower.includes('sure') &&
            !lower.includes('here') &&
            !lower.includes('recommend') &&
            !lower.includes('of course') &&
            !lower.includes('yes') &&
            !lower.includes('no') &&
            !lower.includes('definitely') &&
            !lower.includes('thank') &&
            !uniqueTitles.has(lower)) {
            uniqueTitles.add(lower);
        }
    }

    const potentialList = Array.from(uniqueTitles).slice(0, 10);
    console.log("Potential List:", potentialList);

    const isSimilarTitle = (query, result) => {
        if (!result || !result.title) return false;

        const normQuery = query.toLowerCase().replace(/[^a-z0-9]/g, '');
        const normEnglish = (result.title.english || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normRomaji = (result.title.romaji || '').toLowerCase().replace(/[^a-z0-9]/g, '');

        if (normEnglish.includes(normQuery) || normQuery.includes(normEnglish)) return true;
        if (normRomaji.includes(normQuery) || normQuery.includes(normRomaji)) return true;

        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const allTitleText = (result.title.english + ' ' + result.title.romaji).toLowerCase();

        return queryWords.some(w => allTitleText.includes(w));
    };

    const verificationPromises = potentialList.map(async (title) => {
        try {
            console.log(`Checking: ${title}`);
            const data = await fetchAnimeContext(title);

            if (data) {
                console.log(`Found data for ${title}: ${data.title.english} / ${data.title.romaji}`);
            } else {
                console.log(`No data for ${title}`);
            }

            if (data && isSimilarTitle(title, data)) {
                return data;
            } else {
                console.log(`Failed similarity check for ${title}`);
                return null;
            }
        } catch (e) {
            console.error(`Failed to verify: ${title}`, e);
            return null;
        }
    });

    const results = await Promise.all(verificationPromises);
    return results.filter(item => item !== null);
}

const mockResponse = `
Of course! Here are a few more underrated slice of life anime that you might enjoy:

**Aria the Animation** (Fantasy, Slice of Life): Set in a futuristic Venice-like city...
**Flying Witch** (Comedy, Supernatural): A young witch moves to the countryside...
**Shirobako** (Comedy, Drama): A behind-the-scenes look at the anime industry...
**Tamako Market** (Comedy, Romance): A heartwarming story about a girl...
`;

extractAnimeRecommendations(mockResponse).then(res => {
    console.log("Final Recommendations:", res.map(r => r.title.english || r.title.romaji));
});
