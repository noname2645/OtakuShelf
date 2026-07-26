import { writeFileSync } from 'fs'

const ANILIST_URL = 'https://graphql.anilist.co'

const MEDIA_FIELDS = `
  id
  title { romaji english }
  coverImage { extraLarge large medium }
  description
  episodes
  duration
  format
  status
  season
  seasonYear
  genres
  averageScore
  popularity
  bannerImage
  trailer { id site }
`

function buildEraQuery(where, sort = 'POPULARITY_DESC', perPage = 50) {
  return `query {
    Page(perPage: ${perPage}) {
      media(${where}, sort: ${sort}, type: ANIME, isAdult: false) {
        ${MEDIA_FIELDS}
      }
    }
  }`
}

const sectionsQueries = {
  topAiring: `query { Page(perPage: 10) { media(status: RELEASING, sort: SCORE_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes nextAiringEpisode { episode airingAt } format status genres averageScore description }}}`,
  trending: `query { Page(perPage: 10) { media(sort: TRENDING_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes format status genres averageScore description }}}`,
  topRated: `query { Page(perPage: 10) { media(sort: SCORE_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes format status genres averageScore description }}}`,
  upcoming: `query { Page(perPage: 10) { media(status: NOT_YET_RELEASED, sort: POPULARITY_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes format status genres averageScore description }}}`,
  topMovies: `query { Page(perPage: 10) { media(format: MOVIE, sort: POPULARITY_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes format status genres averageScore description }}}`,
  mostWatched: `query { Page(perPage: 10) { media(sort: POPULARITY_DESC, type: ANIME) { id title { romaji english } coverImage { extraLarge large medium } episodes format status genres averageScore description }}}`,
}

const eraQueries = {
  golden: buildEraQuery('startDate_lesser: 19991231, format_in: [TV, MOVIE, OVA]'),
  millen: buildEraQuery('startDate_greater: 20000000, startDate_lesser: 20121231, format_in: [TV, MOVIE, OVA]'),
  bridge: buildEraQuery('startDate_greater: 20130000, startDate_lesser: 20191231, format_in: [TV, MOVIE, OVA]'),
  current: buildEraQuery('startDate_greater: 20200000, format_in: [TV, MOVIE, OVA]'),
  upcoming: buildEraQuery('status: NOT_YET_RELEASED, format_in: [TV, MOVIE, OVA]'),
}

const GENRE_FILTERS = ['Hentai', 'Ecchi']

async function fetchAniList(query) {
  const res = await fetch(ANILIST_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`AniList error: ${res.status}`)
  return (await res.json()).data
}

async function main() {
  // 1. Seed anime-sections
  console.log('=== Seeding anime-sections ===')
  const sections = {}
  for (const [key, query] of Object.entries(sectionsQueries)) {
    const data = await fetchAniList(query)
    const media = (data.Page.media || []).filter(m => !m.genres?.some(g => GENRE_FILTERS.includes(g)))
    sections[key] = media
    console.log(`  ${key}: ${media.length} items`)
  }
  writeFileSync('anime-sections.json', JSON.stringify(sections))
  console.log('  -> Wrote anime-sections.json\n')

  // 2. Seed hero-trailers
  console.log('=== Seeding hero-trailers ===')
  const eraData = {}
  for (const [era, query] of Object.entries(eraQueries)) {
    const data = await fetchAniList(query)
    eraData[era] = data.Page.media
    console.log(`  ${era}: ${data.Page.media.length} items`)
  }
  writeFileSync('hero-trailers.json', JSON.stringify(eraData))
  console.log('  -> Wrote hero-trailers.json\n')

  console.log('Run:')
  console.log('npx wrangler kv key put --binding CACHE --preview false "anime-sections" --path scripts/anime-sections.json')
  console.log('npx wrangler kv key put --binding CACHE --preview false "hero-trailers" --path scripts/hero-trailers.json')
}

main().catch(console.error)
