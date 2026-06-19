import { MedicinePrice } from "../types";

export const scanPrescription = async (base64Image: string) => {
  try {
    const response = await fetch("/api/gemini/scan-prescription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64Image }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to scan prescription");
    }
    
    return await response.json() as { name: string; dosage: string; sideEffects?: string; prices?: MedicinePrice[] }[];
  } catch (error) {
    console.error("Scan error:", error);
    throw error;
  }
};

export const comparePrices = async (medicineName: string) => {
  try {
    const response = await fetch("/api/gemini/compare-prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ medicineName }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to compare prices");
    }
    
    return await response.json() as { name: string; prices: MedicinePrice[] }[];
  } catch (error) {
    console.error("Compare error:", error);
    throw error;
  }
};

export const getMedicineSuggestions = async (query: string) => {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch("/api/gemini/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get suggestions");
    }
    
    return await response.json() as string[];
  } catch (error) {
    console.error("Suggestions error:", error);
    return [];
  }
};

export const findNearbyPharmacies = async (lat: number, lng: number) => {
  // This one was not fully implemented with structured data yet, 
  // but we can add an endpoint if needed. For now, we'll keep it simple or just stub.
  return "Nearby pharmacy feature is being optimized.";
};
