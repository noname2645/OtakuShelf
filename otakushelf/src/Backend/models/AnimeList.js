import mongoose from 'mongoose';

const animeListSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    watching: [{
        title: String,
        animeId: String,
        malId: String,
        image: String,
        totalEpisodes: Number,
        episodes: Number,
        addedDate: { type: Date, default: Date.now },
        finishDate: Date,
        userRating: Number,
        episodesWatched: { type: Number, default: 0 },
        status: { type: String, default: 'watching' },
        genres: [String]
    }],
    completed: [{
        title: String,
        animeId: String,
        malId: String,
        image: String,
        totalEpisodes: Number,
        episodes: Number,
        addedDate: { type: Date, default: Date.now },
        finishDate: Date,
        userRating: Number,
        episodesWatched: { type: Number, default: 0 },
        status: { type: String, default: 'completed' },
        genres: [String]
    }],
    planned: [{
        title: String,
        animeId: String,
        malId: String,
        image: String,
        totalEpisodes: Number,
        episodes: Number,
        addedDate: { type: Date, default: Date.now },
        plannedDate: Date,
        notes: String,
        status: { type: String, default: 'planned' },
        genres: [String]
    }],
    dropped: [{
        title: String,
        animeId: String,
        malId: String,
        image: String,
        totalEpisodes: Number,
        episodes: Number,
        addedDate: { type: Date, default: Date.now },
        droppedDate: Date,
        reason: String,
        episodesWatched: { type: Number, default: 0 },
        status: { type: String, default: 'dropped' },
        genres: [String]
    }]
});

const AnimeList = mongoose.model("AnimeList", animeListSchema);

export default AnimeList;
