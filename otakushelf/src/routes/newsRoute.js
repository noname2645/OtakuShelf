// routes/newsRoutes.js
import express from "express";
import Parser from "rss-parser";

const router = express.Router();
const parser = new Parser();

router.get("/anime-news", async (req, res) => {
  try {
    const feed = await parser.parseURL("https://www.animenewsnetwork.com/all/rss.xml");

    const topNews = feed.items.slice(0, 5).map((item) => {
      let imageUrl = item.enclosure?.url || "";

      // Fallback: extract image from content
      if (!imageUrl && item.content) {
        const match = item.content.match(/<img.*?src="(.*?)"/);
        if (match) imageUrl = match[1];
      }

      return {
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
        image: imageUrl || "https://via.placeholder.com/1200x400?text=Anime+News",
      };
    });

    console.log(topNews); 

    res.json(topNews);
  } catch (error) {
    console.error("News Fetch Error", error);
    res.status(500).json({ error: "Failed to fetch anime news." });
  }
});

export default router;
