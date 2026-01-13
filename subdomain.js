import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

await axios.post(
  `https://api.cloudflare.com/client/v4/zones/${process.env.ZONE_ID}/dns_records`,
  {
    type: "A",
    name: `test.${process.env.DOMAIN}`,
    content: "1.1.1.1",
    ttl: 120,
    proxied: false,
  },
  {
    headers: {
      Authorization: `Bearer ${process.env.CLOUDFLARE_API_KEY}`,
      "Content-Type": "application/json",
    },
  }
);

console.log("Subdomain created");
