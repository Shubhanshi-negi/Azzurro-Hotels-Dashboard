import type { GuestReview, HotelProperty } from "../lib/types";

export const demoProperties: HotelProperty[] = [
  {
    id: "potts-point",
    name: "Azzurro Pod Hotel – Potts Point",
    location: "Potts Point, Sydney",
    region: "Potts Point · Sydney",
    address: "141–143 Victoria Street, Potts Point, NSW",
    rating: 9.0,
    reviewCount: 4,
    image: "https://cdn.azzurrohostels.com/images/pottspoint.webp",
    accent: "#bde3dc",
    tagline: "A quieter inner-city base, close to the neighbourhood.",
    description:
      "A practical Sydney base near Kings Cross Station, local cafes, Elizabeth Bay and harbour walks, with easy access to the CBD.",
    accommodationStyle: "Budget pod-style beds with privacy curtains, shared bathrooms and common areas, Wi-Fi, charging points and free dinner every night.",
    officialUrl: "https://www.azzurrohotels.com/properties/potts-point",
    categories: {},
  },
  {
    id: "central-sydney",
    name: "Azzurro Pod Hotel – Central Sydney",
    location: "Surry Hills, Sydney",
    region: "Central Sydney · Sydney",
    address: "90 Wentworth Avenue, Surry Hills, NSW",
    rating: 8.8,
    reviewCount: 4,
    image: "https://cdn.azzurrohostels.com/images/central_sydney.webp",
    accent: "#e7d2bd",
    tagline: "A well-connected base beside Central Station.",
    description:
      "A transport-friendly Sydney stay near Central Station, with easy connections to the airport, city, day trips and nearby neighbourhoods.",
    accommodationStyle: "Budget pod-style rooms with shared facilities, Wi-Fi, luggage support and free dinner every night.",
    officialUrl: "https://www.azzurrohotels.com/properties/central-sydney",
    categories: {},
  },
  {
    id: "darling-harbour",
    name: "Azzurro Pod Hotel – Darling Harbour",
    location: "Pyrmont, Sydney",
    region: "Darling Harbour · Sydney",
    address: "22 Allen Street, Pyrmont, NSW",
    rating: 8.7,
    reviewCount: 4,
    image: "https://cdn.azzurrohostels.com/images/darling_harbour.webp",
    accent: "#cae5e9",
    tagline: "Capsule-style stays close to the waterfront.",
    description:
      "A practical Pyrmont base near Darling Harbour, ICC Sydney, restaurants, transport links and waterfront walks.",
    accommodationStyle: "Capsule-style pod beds with privacy curtains, shared bathrooms and common areas, Wi-Fi, charging points and free dinner every night.",
    officialUrl: "https://www.azzurrohotels.com/properties/darling-harbour",
    categories: {},
  },
  {
    id: "olympic-hotel-paddington",
    name: "Olympic Hotel Paddington",
    location: "Paddington, Sydney",
    region: "Paddington · Sydney",
    address: "308 Moore Park Road, Paddington, NSW",
    rating: 8.6,
    reviewCount: 4,
    image: "https://www.azzurrohotels.com/images/olympic-hotel-paddington.jpg",
    accent: "#d8dfe3",
    tagline: "A Paddington classic, close to the big game.",
    description:
      "A Paddington landmark dating to 1936, with a rooftop terrace, sports bar and an easy walk to the SCG and Allianz Stadium.",
    accommodationStyle: "Boutique hotel accommodation with 48 suites, a rooftop terrace and sports bar. Dinner is not included.",
    officialUrl: "https://www.azzurrohotels.com/properties/olympic-hotel-paddington",
    categories: {},
  },
];

type DemoReviewInput = Omit<GuestReview, "source" | "analysisStatus" | "analysisProvider" | "topics">;

const demoReviewExamples: DemoReviewInput[] = [
  { id: "r-001", propertyId: "potts-point", guestName: "Demo guest 01", country: "Demo sample", date: "2026-11-18", stay: "3 nights · Pod stay", score: 9.6, sentiment: "positive", title: "A calm city base", positive: "The privacy pod made it easy to wind down after a busy day. The team made check-in feel straightforward.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-002", propertyId: "potts-point", guestName: "Demo guest 02", country: "Demo sample", date: "2026-11-14", stay: "2 nights · Pod stay", score: 8.4, sentiment: "mixed", title: "Good value, busy shared spaces", positive: "The location worked well for exploring the neighbourhood, and the pod felt private.", negative: "The shared bathroom was busiest in the morning. A little more space to organise luggage would help.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-003", propertyId: "potts-point", guestName: "Demo guest 03", country: "Demo sample", date: "2026-11-08", stay: "4 nights · Pod stay", score: 9.2, sentiment: "positive", title: "Thoughtful touches", positive: "Charging points and a privacy curtain made the pod comfortable for a longer stay.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-004", propertyId: "potts-point", guestName: "Demo guest 04", country: "Demo sample", date: "2026-11-02", stay: "2 nights · Pod stay", score: 7.4, sentiment: "negative", title: "A little noisy overnight", positive: "A convenient base for reaching nearby cafes and transport.", negative: "Sound carried into the sleeping area late at night and interrupted my rest.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-005", propertyId: "central-sydney", guestName: "Demo guest 05", country: "Demo sample", date: "2026-10-25", stay: "3 nights · Pod stay", score: 9.5, sentiment: "positive", title: "Easy to get around", positive: "Being close to transport made getting across the city simple. Staff were kind and helpful.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-006", propertyId: "central-sydney", guestName: "Demo guest 06", country: "Demo sample", date: "2026-10-17", stay: "2 nights · Pod stay", score: 8.8, sentiment: "positive", title: "A handy stopover", positive: "The pod was a welcome bit of privacy and the shared spaces made it easy to settle in.", negative: "", replyStatus: "Needs reply", isDemo: true },
  { id: "r-007", propertyId: "central-sydney", guestName: "Demo guest 07", country: "Demo sample", date: "2026-11-16", stay: "2 nights · Pod stay", score: 9.1, sentiment: "positive", title: "A practical city stay", positive: "Convenient for train connections, with a helpful team and an easy arrival.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-008", propertyId: "central-sydney", guestName: "Demo guest 08", country: "Demo sample", date: "2026-11-09", stay: "3 nights · Pod stay", score: 8.2, sentiment: "mixed", title: "Well connected, some morning queues", positive: "The location was useful for getting around Sydney and the sleeping pod felt private.", negative: "The shared facilities were busy around check-out time.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-009", propertyId: "darling-harbour", guestName: "Demo guest 09", country: "Demo sample", date: "2026-10-29", stay: "4 nights · Pod stay", score: 9.4, sentiment: "positive", title: "A welcoming place to recharge", positive: "The capsule gave me a quiet place to rest, and the shared areas were easy to use.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-010", propertyId: "darling-harbour", guestName: "Demo guest 10", country: "Demo sample", date: "2026-10-15", stay: "1 night · Pod stay", score: 7.8, sentiment: "negative", title: "Convenient for the waterfront", positive: "A useful location for exploring Pyrmont and the harbour area.", negative: "The shared bathroom could have used a more frequent check during the evening.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-011", propertyId: "darling-harbour", guestName: "Demo guest 11", country: "Demo sample", date: "2026-11-12", stay: "3 nights · Pod stay", score: 9.2, sentiment: "positive", title: "A sociable stay", positive: "The pod offered a little privacy and it was easy to meet other travellers in the common area.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-012", propertyId: "darling-harbour", guestName: "Demo guest 12", country: "Demo sample", date: "2026-10-30", stay: "3 nights · Pod stay", score: 8.1, sentiment: "mixed", title: "Great base, bring a sleep mask", positive: "Handy for the harbour and local event venues, with practical pod accommodation.", negative: "Light from the shared area reached my pod late in the evening.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-013", propertyId: "olympic-hotel-paddington", guestName: "Demo guest 13", country: "Demo sample", date: "2026-10-11", stay: "2 nights · Suite stay", score: 8.8, sentiment: "positive", title: "A classic local stay", positive: "The suite gave us room to settle in, and the rooftop was a lovely place to unwind.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-014", propertyId: "olympic-hotel-paddington", guestName: "Demo guest 14", country: "Demo sample", date: "2026-11-07", stay: "2 nights · Suite stay", score: 9.0, sentiment: "positive", title: "Handy for event day", positive: "The Paddington location made getting to the nearby stadiums straightforward.", negative: "", replyStatus: "Replied", isDemo: true },
  { id: "r-015", propertyId: "olympic-hotel-paddington", guestName: "Demo guest 15", country: "Demo sample", date: "2026-10-23", stay: "1 night · Suite stay", score: 7.6, sentiment: "negative", title: "A lively evening downstairs", positive: "The suite was a comfortable base near Paddington and the event precinct.", negative: "Noise from the bar area carried later than I expected.", replyStatus: "Needs reply", isDemo: true },
  { id: "r-016", propertyId: "olympic-hotel-paddington", guestName: "Demo guest 16", country: "Demo sample", date: "2026-10-04", stay: "3 nights · Suite stay", score: 8.9, sentiment: "positive", title: "A friendly welcome", positive: "The staff were helpful, and the rooftop and sports bar gave the hotel a relaxed local feel.", negative: "", replyStatus: "Replied", isDemo: true },
];

export const demoReviews: GuestReview[] = demoReviewExamples.map((review) => ({
  ...review,
  source: "demo",
  analysisStatus: "complete",
  analysisProvider: "Synthetic demo labels",
  topics: ["Synthetic demo review"],
}));
