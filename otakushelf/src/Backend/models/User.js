import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String },
    authType: { type: String, enum: ["local", "google"], required: true },
    photo: { type: String },
    name: { type: String },
    profile: {
        username: { type: String, unique: true, sparse: true },
        bio: { type: String, default: "" },
        joinDate: { type: Date, default: Date.now },
        coverImage: { type: String, default: null },
        stats: {
            animeWatched: { type: Number, default: 0 },
            hoursWatched: { type: Number, default: 0 },
            currentlyWatching: { type: Number, default: 0 },
            favorites: { type: Number, default: 0 },
            animePlanned: { type: Number, default: 0 },
            animeDropped: { type: Number, default: 0 },
            totalEpisodes: { type: Number, default: 0 },
            meanScore: { type: Number, default: 0 }
        },
        badges: [{
            title: String,
            description: String,
            icon: String,
            earnedDate: Date
        }],
        favoriteGenres: [{
            name: String,
            percentage: Number
        }],
        preferences: {
            theme: { type: String, default: "light" },
            privacy: { type: String, default: "public" }
        }
    }
}, { timestamps: true });

const User = mongoose.model("User", userSchema);

export default User;
