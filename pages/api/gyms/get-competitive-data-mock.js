export default function handler(req, res) {
  console.log("DEBUG: Mock gym data API called with query:", req.query);

  // Return hardcoded gym data
  const mockData = [
    {
      "Name": "GoodLife Fitness",
      "URL": "https://www.goodlifefitness.com",
      "Category": "Full-service gym chain",
      "Offerings": "Equipment, group classes, personal training, amenities like pools and saunas",
      "Pricing (CAD)": "$60-90/month membership; $75-90/hr personal training",
      "What People Are Saying (Positive)": "Convenient locations, good equipment variety, 24-hour access at some locations",
      "What People Are Saying (Negative)": "Crowded during peak hours, impersonal experience, difficult cancellation process",
      "Insights/Opportunities/Suggestions for a Self-Employed Personal Trainer (In-Person & Online)": "Emphasize personalized attention and consistent relationship with one trainer versus rotating staff",
      "Primary Target Audience for Gym": "General fitness population, 25-55 age range",
      "Localized Location in Downtown Toronto": "Multiple downtown locations"
    },
    {
      "Name": "F45 Training",
      "URL": "https://f45training.com",
      "Category": "Group fitness studio",
      "Offerings": "High-intensity functional 45-minute group workouts combining circuit and HIIT training styles",
      "Pricing (CAD)": "$60-75/week for unlimited classes",
      "What People Are Saying (Positive)": "Effective workouts, motivating environment, strong community feel",
      "What People Are Saying (Negative)": "Expensive, intimidating for beginners, not flexible for individual needs",
      "Insights/Opportunities/Suggestions for a Self-Employed Personal Trainer (In-Person & Online)": "Create hybrid offerings that combine the energy of group workouts with personalized attention",
      "Primary Target Audience for Gym": "Fitness enthusiasts, 25-40 age range, time-conscious professionals",
      "Localized Location in Downtown Toronto": "King West, Liberty Village, Queen West"
    },
    {
      "Name": "Studio Lagree",
      "URL": "https://studiolagree.com",
      "Category": "Boutique fitness studio",
      "Offerings": "Megaformer workouts (Lagree Method) combining elements of Pilates, cardio and strength training",
      "Pricing (CAD)": "$40-45/class with discounts for packages",
      "What People Are Saying (Positive)": "Effective for toning, low-impact but challenging, trendy workout",
      "What People Are Saying (Negative)": "Very expensive, limited class size, intimidating for beginners",
      "Insights/Opportunities/Suggestions for a Self-Employed Personal Trainer (In-Person & Online)": "Offer more accessible versions of boutique fitness trends with personalized attention",
      "Primary Target Audience for Gym": "Affluent professionals, predominantly women, 28-45 age range",
      "Localized Location in Downtown Toronto": "King West, Yorkville"
    }
  ];
  
  // Filter by location if provided
  const { location } = req.query;
  let filteredData = mockData;
  
  if (location) {
    console.log("DEBUG: Filtering by location:", location);
    filteredData = mockData.filter(gym => 
      gym["Localized Location in Downtown Toronto"].toLowerCase().includes(location.toLowerCase())
    );
  }
  
  console.log("DEBUG: Returning", filteredData.length, "gym records");
  
  return res.status(200).json({ 
    data: filteredData
  });
} 